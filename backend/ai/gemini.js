// =============================================================
//  backend/ai/gemini.js
//  Central AI service — all Gemini calls go through here
// =============================================================

const { GoogleGenerativeAI } = require("@google/generative-ai");

const CAMPUS_CATEGORIES = [
    "Electricity",
    "Water",
    "Cleanliness",
    "Infrastructure",
    "Wi-Fi / Internet",
    "Security",
    "Other"
];

// Models to try in order of preference.
// gemini-flash-latest has standard free-tier quotas.
const CANDIDATE_MODELS = [
    "gemini-flash-latest",
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.7-flash"
];

let genAI = null;
let activeModelName = null;

function isEnabled() {
    return Boolean(process.env.GEMINI_API_KEY);
}

function getClient() {
    if (!process.env.GEMINI_API_KEY) {
        return null;
    }
    if (!genAI) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return genAI;
}

// -------------------------------------------------------------
//  Heuristic Fallbacks (Ensures features never fail if offline / quota)
// -------------------------------------------------------------
function heuristicCategory(title = "", description = "") {
    const text = `${title} ${description}`.toLowerCase();
    if (/wi-?fi|internet|network|router|ethernet|connection|online|lan|speed|signal/i.test(text)) {
        return { categoryName: "Wi-Fi / Internet", confidence: "MEDIUM" };
    }
    if (/water|leak|tap|pipe|flush|plumb|drain|sink|washbasin|tank|overflow/i.test(text)) {
        return { categoryName: "Water", confidence: "MEDIUM" };
    }
    if (/electric|light|fan|power|bulb|switch|plug|socket|wire|short circuit|blackout|mcb/i.test(text)) {
        return { categoryName: "Electricity", confidence: "MEDIUM" };
    }
    if (/clean|dustbin|garbage|trash|dirty|smell|stench|washroom|toilet|mess|dust/i.test(text)) {
        return { categoryName: "Cleanliness", confidence: "MEDIUM" };
    }
    if (/door|window|chair|bench|desk|wall|ceiling|lift|elevator|broken|furniture|board|stairs|floor/i.test(text)) {
        return { categoryName: "Infrastructure", confidence: "MEDIUM" };
    }
    if (/guard|theft|stolen|robbery|cctv|security|threat|fight|harass|gate|trespass/i.test(text)) {
        return { categoryName: "Security", confidence: "MEDIUM" };
    }
    return { categoryName: "Other", confidence: "LOW" };
}

function heuristicPriority(title = "", description = "") {
    const text = `${title} ${description}`.toLowerCase();
    if (/fire|smoke|hazard|spark|shock|blood|emergency|danger|severe|critical|collapse/i.test(text)) {
        return "CRITICAL";
    }
    if (/entire|whole|all|urgent|blackout|no internet|exam|completely down|flood|burst/i.test(text)) {
        return "HIGH";
    }
    if (/broken|not working|leak|faulty|damaged|slow|cracked/i.test(text)) {
        return "MEDIUM";
    }
    return "LOW";
}

// -------------------------------------------------------------
//  Core Gemini invocation with model fallback
// -------------------------------------------------------------
async function ask(prompt) {
    const client = getClient();
    if (!client) return null;

    // Start with last successful model or first candidate
    const modelsToTry = activeModelName
        ? [activeModelName, ...CANDIDATE_MODELS.filter(m => m !== activeModelName)]
        : CANDIDATE_MODELS;

    for (const modelName of modelsToTry) {
        try {
            const m = client.getGenerativeModel({ model: modelName });
            const result = await m.generateContent(prompt);
            activeModelName = modelName; // remember working model
            return result.response.text().trim();
        } catch (err) {
            console.warn(`[Gemini] Model ${modelName} failed (${err.message}). Trying fallback...`);
        }
    }

    console.error("[Gemini] All candidate models failed or quota exceeded.");
    return null;
}

// =============================================================
//  UNIFIED REAL-TIME ANALYSIS (1 single API call for all 3 tasks)
// =============================================================
async function analyzeIssue(title, description, location = "", existingIssues = []) {
    const fallbackCat = heuristicCategory(title, description);
    const fallbackPri = heuristicPriority(title, description);

    // Heuristic duplicate check
    let fallbackDup = { isDuplicate: false, matchedIssueId: null, confidence: "LOW" };
    const locLower = (location || "").trim().toLowerCase();
    const titleLower = (title || "").trim().toLowerCase();
    if (existingIssues.length) {
        const found = existingIssues.find(i => {
            const matchLoc = locLower && (i.location || "").toLowerCase().includes(locLower);
            const matchTitle = (i.title || "").toLowerCase().includes(titleLower) || titleLower.includes((i.title || "").toLowerCase());
            return matchLoc && matchTitle;
        });
        if (found) {
            fallbackDup = { isDuplicate: true, matchedIssueId: found.issue_id, confidence: "MEDIUM" };
        }
    }

    if (!isEnabled()) {
        return {
            suggested_priority: fallbackPri,
            suggested_category: fallbackCat,
            duplicate_check: fallbackDup,
        };
    }

    const issuesSample = existingIssues.slice(0, 20)
        .map(i => `ID:${i.issue_id} | "${i.title}" | Loc: ${i.location} | Desc: ${(i.description || "").slice(0, 60)}`)
        .join("\n");

    const prompt = `You are a campus issue assistant. Analyze this complaint and return ONLY a single JSON object.

NEW COMPLAINT:
Title: ${title}
Location: ${location || "Campus"}
Description: ${description}

CATEGORIES:
${CAMPUS_CATEGORIES.join(", ")}

${issuesSample ? `EXISTING OPEN ISSUES:\n${issuesSample}\n` : ""}
Task:
1. "categoryName": Choose best category from list.
2. "categoryConfidence": "HIGH", "MEDIUM", or "LOW".
3. "priority": "CRITICAL" (safety/campus outage), "HIGH" (major disruption), "MEDIUM" (manageable), or "LOW" (minor).
4. "isDuplicate": true if same problem at same location as an existing issue, false otherwise.
5. "matchedIssueId": ID of matched issue or null.
6. "duplicateConfidence": "HIGH", "MEDIUM", or "LOW".

Output JSON format ONLY (no markdown fences, no extra text):
{"categoryName": "...", "categoryConfidence": "HIGH", "priority": "...", "isDuplicate": false, "matchedIssueId": null, "duplicateConfidence": "LOW"}`;

    const raw = await ask(prompt);
    if (!raw) {
        return {
            suggested_priority: fallbackPri,
            suggested_category: fallbackCat,
            duplicate_check: fallbackDup,
        };
    }

    try {
        const cleaned = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        const matchedCat = CAMPUS_CATEGORIES.find(
            c => c.toLowerCase() === (parsed.categoryName || "").toLowerCase()
        );

        const validPriorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
        const priUpper = (parsed.priority || "").toUpperCase().trim();

        return {
            suggested_priority: validPriorities.includes(priUpper) ? priUpper : fallbackPri,
            suggested_category: {
                categoryName: matchedCat || fallbackCat.categoryName,
                confidence: parsed.categoryConfidence || "HIGH",
            },
            duplicate_check: {
                isDuplicate: Boolean(parsed.isDuplicate),
                matchedIssueId: parsed.matchedIssueId || fallbackDup.matchedIssueId,
                confidence: parsed.duplicateConfidence || fallbackDup.confidence,
            },
        };
    } catch (parseErr) {
        console.warn("[Gemini] Parse error on response:", raw);
        return {
            suggested_priority: fallbackPri,
            suggested_category: fallbackCat,
            duplicate_check: fallbackDup,
        };
    }
}

// =============================================================
//  1. SEMANTIC DUPLICATE DETECTION (Backward Compatibility)
// =============================================================
async function detectDuplicate(newIssue, existingIssues) {
    if (!existingIssues.length) return { isDuplicate: false, matchedIssueId: null };
    const existingList = existingIssues
        .map((i) => `ID:${i.issue_id} | "${i.title}" | ${i.location} | ${(i.description || "").slice(0, 80)}`)
        .join("\n");
    const prompt = `You are a campus issue deduplication system. Determine if a NEW issue is a duplicate of any EXISTING open issue.

NEW ISSUE:
Title: ${newIssue.title}
Location: ${newIssue.location}
Description: ${newIssue.description}

EXISTING OPEN ISSUES:
${existingList}

Respond ONLY in this exact JSON format (no markdown):
{"isDuplicate": true/false, "matchedIssueId": <ID or null>, "confidence": "HIGH"/"MEDIUM"/"LOW"}`;

    const raw = await ask(prompt);
    if (!raw) return { isDuplicate: false, matchedIssueId: null };
    try {
        const cleaned = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        return { isDuplicate: Boolean(parsed.isDuplicate), matchedIssueId: parsed.matchedIssueId || null, confidence: parsed.confidence || "LOW" };
    } catch { return { isDuplicate: false, matchedIssueId: null }; }
}

// =============================================================
//  2. AUTO-PRIORITY SCORING (Backward Compatibility)
// =============================================================
async function scorePriority(title, description, category) {
    const prompt = `You are a campus facilities priority system. Assign a priority to this campus complaint.

Title: ${title}
Category: ${category || "General"}
Description: ${description}

Priority scale:
- CRITICAL: Immediate safety hazard, health risk, or complete service outage affecting many people
- HIGH: Significant disruption to daily activities
- MEDIUM: Inconvenience but manageable
- LOW: Minor cosmetic or non-urgent issues

Respond with ONLY one word: CRITICAL, HIGH, MEDIUM, or LOW`;
    const result = await ask(prompt);
    if (!result) return heuristicPriority(title, description);
    const cleaned = result.toUpperCase().replace(/[^A-Z]/g, "");
    return ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(cleaned) ? cleaned : heuristicPriority(title, description);
}

// =============================================================
//  3. AUTO-CATEGORY DETECTION (Backward Compatibility)
// =============================================================
async function detectCategory(title, description) {
    const prompt = `You are a campus issue classification system. Classify this issue into the most appropriate category.

Title: ${title}
Description: ${description}

Available categories: ${CAMPUS_CATEGORIES.join(", ")}

Respond ONLY in this exact JSON format (no markdown):
{"categoryName": "<exact category name from the list>", "confidence": "HIGH"/"MEDIUM"/"LOW"}`;
    const raw = await ask(prompt);
    if (!raw) return heuristicCategory(title, description);
    try {
        const cleaned = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        const match = CAMPUS_CATEGORIES.find((c) => c.toLowerCase() === (parsed.categoryName || "").toLowerCase());
        return { categoryName: match || heuristicCategory(title, description).categoryName, confidence: parsed.confidence || "HIGH" };
    } catch { return heuristicCategory(title, description); }
}

// =============================================================
//  4. AI ISSUE SUMMARY
// =============================================================
async function summariseIssues(issues) {
    if (!issues.length) return null;
    const reports = issues.map((i, idx) => `Report ${idx + 1}: ${i.title} - ${(i.description || "").slice(0, 120)}`).join("\n");
    const prompt = `Summarise these campus issue reports into ONE clear concise sentence (max 30 words) describing the core problem:\n${reports}\n\nRespond with ONLY the summary sentence.`;
    return await ask(prompt);
}

module.exports = {
    analyzeIssue,
    detectDuplicate,
    scorePriority,
    detectCategory,
    summariseIssues,
    isEnabled: () => Boolean(process.env.GEMINI_API_KEY)
};
