
// =============================================================
// backend/ai/gemini.js  ·  Campus Civic AI Service (Full v2)
// All Gemini calls go through here — one model instance, shared.
// =============================================================

const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI = null;
let model = null;

// =============================================================
// BOOTSTRAP
// =============================================================

const CANDIDATE_MODELS = ["gemini-flash-latest", "gemini-2.5-flash-lite"];

function getGenAI() {
    if (!process.env.GEMINI_API_KEY) {
        console.error("[Gemini] GEMINI_API_KEY missing");
        return null;
    }
    if (!genAI) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return genAI;
}

function getModel(modelName = "gemini-flash-latest") {
    const ai = getGenAI();
    if (!ai) return null;
    return ai.getGenerativeModel({ model: modelName });
}

function isEnabled() {
    return Boolean(process.env.GEMINI_API_KEY);
}

// =============================================================
// CORE HELPER — safe JSON parse + strip markdown fences
// =============================================================

function parseJSON(raw) {
    if (!raw) return null;
    const cleaned = raw
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
    try {
        return JSON.parse(cleaned);
    } catch {
        // Try extracting first {...} block
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
            try { return JSON.parse(match[0]); } catch {}
        }
        return null;
    }
}

// =============================================================
// CORE HELPER — safe Gemini call with hard timeout
// =============================================================

const AI_TIMEOUT_MS = 25_000; // 25 seconds — never hang forever

function withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`[Gemini] Timeout after ${ms}ms on: ${label}`));
        }, ms);

        promise
            .then((val) => { clearTimeout(timer); resolve(val); })
            .catch((err) => { clearTimeout(timer); reject(err); });
    });
}

async function ask(prompt) {
    const ai = getGenAI();
    if (!ai) return null;

    for (const mName of CANDIDATE_MODELS) {
        try {
            const m       = ai.getGenerativeModel({ model: mName });
            const raw     = m.generateContent(prompt);
            const result  = await withTimeout(raw, AI_TIMEOUT_MS, mName);
            const text    = result?.response?.text?.();
            if (text) return text.trim();
        } catch (err) {
            console.error(`[Gemini] Error on ${mName}:`, err.message);
            // Try next model if available
        }
    }
    return null; // All models failed — callers handle null gracefully
}

// =============================================================
// 1. SEMANTIC DUPLICATE DETECTION
// =============================================================

async function detectDuplicate(newIssue, existingIssues) {
    if (!Array.isArray(existingIssues) || existingIssues.length === 0) {
        return { isDuplicate: false, matchedIssueId: null, confidence: "LOW" };
    }

    const existingList = existingIssues
        .map(i => `ID: ${i.issue_id}\nTitle: ${i.title}\nLocation: ${i.location}\nDescription: ${(i.description||"").slice(0,500)}`)
        .join("\n---\n");

    const prompt = `
You are a STRICT duplicate complaint detector for a college campus.
Compare the NEW COMPLAINT against EXISTING OPEN COMPLAINTS.
A complaint is DUPLICATE only if it describes the SAME problem at the SAME or clearly equivalent physical location.

NEW COMPLAINT:
Title: ${newIssue.title}
Location: ${newIssue.location}
Description: ${newIssue.description}

EXISTING OPEN COMPLAINTS:
${existingList}

RULES:
- Same problem + same location = DUPLICATE
- Different location = NOT DUPLICATE
- Different problem = NOT DUPLICATE  
- Uncertainty = NOT DUPLICATE
- Only use IDs from the list above

Return ONLY valid JSON:
{"isDuplicate": true/false, "matchedIssueId": ID_OR_NULL, "confidence": "HIGH"|"MEDIUM"|"LOW"}
`;

    const raw    = await ask(prompt);
    const parsed = parseJSON(raw);

    if (!parsed) return { isDuplicate: false, matchedIssueId: null, confidence: "LOW", aiError: true };

    const validMatch = existingIssues.find(i => String(i.issue_id) === String(parsed.matchedIssueId));

    if (Boolean(parsed.isDuplicate) && !validMatch) {
        return { isDuplicate: false, matchedIssueId: null, confidence: "LOW" };
    }

    return {
        isDuplicate:    Boolean(parsed.isDuplicate) && Boolean(validMatch),
        matchedIssueId: parsed.isDuplicate && validMatch ? validMatch.issue_id : null,
        confidence:     ["HIGH","MEDIUM","LOW"].includes(String(parsed.confidence||"").toUpperCase())
                            ? String(parsed.confidence).toUpperCase()
                            : "LOW",
    };
}

// =============================================================
// 2. AUTO PRIORITY SCORING
// =============================================================

async function scorePriority(title, description, category) {
    const prompt = `
You are a college campus complaint priority classifier.

Title: ${title}
Category: ${category || "General"}
Description: ${description}

CRITICAL = immediate safety hazard, serious health risk, or complete service outage affecting many.
HIGH     = significant disruption to normal campus activities.
MEDIUM   = normal inconvenience.
LOW      = minor or cosmetic issue.

Return ONLY one word: CRITICAL, HIGH, MEDIUM, or LOW.
`;
    const result = await ask(prompt);
    if (!result) return "MEDIUM";
    const cleaned = result.toUpperCase().replace(/[^A-Z]/g, "");
    return ["CRITICAL","HIGH","MEDIUM","LOW"].includes(cleaned) ? cleaned : "MEDIUM";
}

// =============================================================
// 3. AUTO CATEGORY DETECTION
// =============================================================

const CAMPUS_CATEGORIES = [
    "Electricity", "Water", "Cleanliness", "Infrastructure",
    "Wi-Fi / Internet", "Security", "Other",
];

async function detectCategory(title, description) {
    const prompt = `
Classify this college campus complaint into exactly one category.

Title: ${title}
Description: ${description}

Available categories: ${CAMPUS_CATEGORIES.join(", ")}

Return ONLY valid JSON:
{"categoryName": "exact category name", "confidence": "HIGH"|"MEDIUM"|"LOW"}
`;
    const raw    = await ask(prompt);
    const parsed = parseJSON(raw);
    if (!parsed) return { categoryName: null, confidence: "LOW" };

    const matched = CAMPUS_CATEGORIES.find(
        c => c.toLowerCase() === String(parsed.categoryName||"").toLowerCase()
    );
    return {
        categoryName: matched || null,
        confidence:   ["HIGH","MEDIUM","LOW"].includes(String(parsed.confidence||"").toUpperCase())
                          ? String(parsed.confidence).toUpperCase()
                          : "LOW",
    };
}

// =============================================================
// 4. ISSUE QUALITY GATE
//    Validates submission BEFORE saving — blocks garbage/spam
// =============================================================

async function validateIssue(title, description, location) {
    const prompt = `
You are a quality gate for a college campus issue reporting system.
Check if this submission is valid, specific, and appropriate.

Title: ${title}
Location: ${location}
Description: ${description}

Check for these problems:
1. TOO_VAGUE       — description has fewer than 15 meaningful words, or is just "fix it", "problem here", etc.
2. SPAM            — promotional content, gibberish, repeated characters, test submissions
3. OFFENSIVE       — hate speech, harassment, personal attacks
4. NOT_CAMPUS      — unrelated to campus infrastructure, services, or facilities
5. MISSING_LOCATION — location is empty, "unknown", or too generic like "campus"

Return ONLY valid JSON:
{
  "isValid": true/false,
  "issues": ["TOO_VAGUE"|"SPAM"|"OFFENSIVE"|"NOT_CAMPUS"|"MISSING_LOCATION"],
  "suggestion": "one short sentence of improvement advice, or null if valid"
}

If the report is perfectly fine, return: {"isValid": true, "issues": [], "suggestion": null}
`;
    const raw    = await ask(prompt);
    const parsed = parseJSON(raw);
    if (!parsed) return { isValid: true, issues: [], suggestion: null }; // fail open

    return {
        isValid:    Boolean(parsed.isValid),
        issues:     Array.isArray(parsed.issues) ? parsed.issues : [],
        suggestion: parsed.suggestion || null,
    };
}

// =============================================================
// 5. SENTIMENT & URGENCY ANALYSIS
//    Returns frustration level, emotion, and urgency flag
// =============================================================

async function analyseSentiment(title, description) {
    const prompt = `
Analyse the emotional tone and urgency of this campus complaint.

Title: ${title}
Description: ${description}

Return ONLY valid JSON:
{
  "sentiment":  "FRUSTRATED"|"ANGRY"|"NEUTRAL"|"CONCERNED"|"URGENT",
  "urgencyFlag": true/false,
  "tone":        "one adjective describing the writing tone",
  "summary":     "one sentence describing the emotional context"
}
`;
    const raw    = await ask(prompt);
    const parsed = parseJSON(raw);
    if (!parsed) return { sentiment: "NEUTRAL", urgencyFlag: false, tone: "neutral", summary: null };

    const validSentiments = ["FRUSTRATED","ANGRY","NEUTRAL","CONCERNED","URGENT"];
    return {
        sentiment:   validSentiments.includes(String(parsed.sentiment||"").toUpperCase())
                         ? String(parsed.sentiment).toUpperCase()
                         : "NEUTRAL",
        urgencyFlag: Boolean(parsed.urgencyFlag),
        tone:        parsed.tone        || "neutral",
        summary:     parsed.summary     || null,
    };
}

// =============================================================
// 6. SMART RESOLUTION SUGGESTIONS (for admins)
//    Provides actionable steps to resolve an issue
// =============================================================

async function suggestResolution(title, description, category, priority) {
    const prompt = `
You are an expert campus facilities manager.
An issue has been reported. Provide practical resolution guidance for the admin.

Issue Title:    ${title}
Category:       ${category || "General"}
Priority:       ${priority || "MEDIUM"}
Description:    ${description}

Provide:
1. Root cause hypothesis (1 sentence)
2. Immediate action steps (2-4 bullet points, each ≤ 12 words)
3. Escalation recommendation (who to contact)
4. Estimated resolution time

Return ONLY valid JSON:
{
  "rootCause":    "one sentence hypothesis",
  "steps":        ["step 1", "step 2", "step 3"],
  "escalateTo":   "department or role name",
  "estimatedTime": "e.g. 2-4 hours or 1-2 days"
}
`;
    const raw    = await ask(prompt);
    const parsed = parseJSON(raw);
    if (!parsed) return null;

    return {
        rootCause:     parsed.rootCause     || null,
        steps:         Array.isArray(parsed.steps) ? parsed.steps : [],
        escalateTo:    parsed.escalateTo    || null,
        estimatedTime: parsed.estimatedTime || null,
    };
}

// =============================================================
// 7. NATURAL LANGUAGE SEARCH
//    Converts a free-text query into structured search filters
// =============================================================

const VALID_STATUSES    = ["SUBMITTED","PENDING","VERIFIED","IN_PROGRESS","RESOLVED","CLOSED","REJECTED"];
const VALID_PRIORITIES  = ["CRITICAL","HIGH","MEDIUM","LOW"];

async function nlpSearch(query) {
    const prompt = `
You are a search assistant for a college campus issue tracker.
Convert the user's natural language query into structured search filters.

User query: "${query}"

Available categories: Electricity, Water, Cleanliness, Infrastructure, Wi-Fi / Internet, Security, Other
Available statuses: SUBMITTED, PENDING, VERIFIED, IN_PROGRESS, RESOLVED, CLOSED, REJECTED
Available priorities: CRITICAL, HIGH, MEDIUM, LOW

Return ONLY valid JSON:
{
  "keywords":  ["word1", "word2"],
  "category":  "category name or null",
  "status":    "STATUS or null",
  "priority":  "PRIORITY or null",
  "location":  "location string or null",
  "intent":    "short description of what the user is looking for"
}
`;
    const raw    = await ask(prompt);
    const parsed = parseJSON(raw);
    if (!parsed) return { keywords: query.split(" ").filter(Boolean), category: null, status: null, priority: null, location: null, intent: query };

    return {
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        category: parsed.category || null,
        status:   VALID_STATUSES.includes(String(parsed.status||"").toUpperCase())
                      ? String(parsed.status).toUpperCase()
                      : null,
        priority: VALID_PRIORITIES.includes(String(parsed.priority||"").toUpperCase())
                      ? String(parsed.priority).toUpperCase()
                      : null,
        location: parsed.location || null,
        intent:   parsed.intent   || query,
    };
}

// =============================================================
// 8. AUTO-ESCALATION CHECK
//    Decides if an issue should be escalated based on age & priority
// =============================================================

async function shouldEscalate(issue) {
    const ageHours = (Date.now() - new Date(issue.created_at).getTime()) / 3600000;

    const prompt = `
You are an issue escalation decision engine for a college campus.

Issue:
Title:       ${issue.title}
Category:    ${issue.category_name}
Priority:    ${issue.priority}
Status:      ${issue.status}
Age (hours): ${Math.round(ageHours)}
Upvotes:     ${issue.report_count || 0}
Description: ${(issue.description||"").slice(0, 300)}

Decide if this issue should be escalated to senior management.

Escalate if:
- CRITICAL issues unresolved for >4 hours
- HIGH issues unresolved for >24 hours
- MEDIUM issues unresolved for >72 hours
- Any issue with >20 upvotes still PENDING
- Issue description implies safety risk regardless of priority

Return ONLY valid JSON:
{
  "shouldEscalate": true/false,
  "reason":         "one sentence reason",
  "escalateTo":     "role/department to escalate to or null"
}
`;
    const raw    = await ask(prompt);
    const parsed = parseJSON(raw);
    if (!parsed) return { shouldEscalate: false, reason: null, escalateTo: null };

    return {
        shouldEscalate: Boolean(parsed.shouldEscalate),
        reason:         parsed.reason     || null,
        escalateTo:     parsed.escalateTo || null,
    };
}

// =============================================================
// 9. TREND & PATTERN DETECTION
//    Spots recurring issues and emerging clusters
// =============================================================

async function detectTrends(issues) {
    if (!Array.isArray(issues) || issues.length < 3) {
        return { trends: [], hotspots: [], recommendation: null };
    }

    const issueList = issues.slice(0, 50)
        .map(i => `[${i.category_name}] ${i.title} @ ${i.location} (${i.status}, ${i.priority})`)
        .join("\n");

    const prompt = `
You are a campus issue trend analyser.
Identify patterns in these recently reported campus issues.

ISSUES (last 30 days):
${issueList}

Identify:
1. Trending problems (recurring issue types)
2. Problem hotspots (locations with multiple issues)  
3. One strategic recommendation for administration

Return ONLY valid JSON:
{
  "trends": [
    {"pattern": "description", "count": N, "category": "category", "severity": "HIGH|MEDIUM|LOW"}
  ],
  "hotspots": [
    {"location": "place", "issueCount": N, "primaryCategory": "category"}
  ],
  "recommendation": "one actionable sentence for administration"
}
`;
    const raw    = await ask(prompt);
    const parsed = parseJSON(raw);
    if (!parsed) return { trends: [], hotspots: [], recommendation: null };

    return {
        trends:         Array.isArray(parsed.trends)    ? parsed.trends    : [],
        hotspots:       Array.isArray(parsed.hotspots)  ? parsed.hotspots  : [],
        recommendation: parsed.recommendation || null,
    };
}

// =============================================================
// 10. ADMIN DIGEST (daily/on-demand summary)
// =============================================================

async function generateAdminDigest(stats, recentIssues) {
    const prompt = `
You are an AI assistant for a college campus issue management system.
Generate a concise admin digest report.

STATISTICS:
- Total open issues:    ${stats.pending || 0}
- Critical unresolved:  ${stats.critical || 0}
- Resolved today:       ${stats.resolvedToday || 0}
- New today:            ${stats.newToday || 0}
- Resolution rate:      ${stats.resolutionRate || 0}%

TOP RECENT ISSUES:
${(recentIssues||[]).slice(0,5).map(i => `- [${i.priority}] ${i.title} @ ${i.location}`).join("\n")}

Write a professional 3-sentence digest:
1. Overall campus health assessment
2. Most urgent items needing attention
3. Positive note or encouragement

Return ONLY the 3 sentences as plain text (no JSON, no bullet points).
`;
    return await ask(prompt);
}

// =============================================================
// 11. SINGLE ISSUE SUMMARY (for admin view)
// =============================================================

async function summariseIssues(issues) {
    if (!Array.isArray(issues) || issues.length === 0) return null;

    const reports = issues
        .map((i, idx) => `Report ${idx + 1}: ${i.title} - ${i.description || ""}`)
        .join("\n");

    const prompt = `
Summarise these college campus complaints into ONE clear sentence of maximum 30 words.

${reports}

Return ONLY the summary sentence.
`;
    return await ask(prompt);
}

// =============================================================
// EXPORTS
// =============================================================

module.exports = {
    isEnabled,
    callGemini: ask,   // raw Gemini prompt → text
    // Core (existing)
    detectDuplicate,
    scorePriority,
    detectCategory,
    summariseIssues,
    // New
    validateIssue,
    analyseSentiment,
    suggestResolution,
    nlpSearch,
    shouldEscalate,
    detectTrends,
    generateAdminDigest,
};
