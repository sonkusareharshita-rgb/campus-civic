// =============================================================
//  backend/ai/gemini.js
//  Central AI service � all Gemini calls go through here
// =============================================================

const { GoogleGenerativeAI } = require("@google/generative-ai");

// -- Initialise client (lazy � only when key is present) ------
let genAI = null;
let model = null;

function getModel() {
    if (!process.env.GEMINI_API_KEY) {
        return null;
    }
    if (!model) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
    }
    return model;
}

async function ask(prompt) {
    const m = getModel();
    if (!m) return null;
    try {
        const result = await m.generateContent(prompt);
        return result.response.text().trim();
    } catch (err) {
        console.error("[Gemini] API error:", err.message);
        return null;
    }
}

// =============================================================
//  1. SEMANTIC DUPLICATE DETECTION
// =============================================================
async function detectDuplicate(newIssue, existingIssues) {
    if (!existingIssues.length) return { isDuplicate: false, matchedIssueId: null };
    const existingList = existingIssues
        .map((i) => `ID:${i.issue_id} | "${i.title}" | ${i.location} | ${(i.description||"").slice(0, 80)}`)
        .join("\n");
    const prompt = `You are a campus issue deduplication system. Determine if a NEW issue is a duplicate of any EXISTING open issue.

NEW ISSUE:
Title: ${newIssue.title}
Location: ${newIssue.location}
Description: ${newIssue.description}

EXISTING OPEN ISSUES:
${existingList}

Rules:
- A duplicate means the same physical problem at the same place, even if worded differently.
- "Wi-Fi not working in Library" and "Internet is down in the library" ARE duplicates.
- "Broken chair in Lab A" and "Broken bench near canteen" are NOT duplicates.

Respond ONLY in this exact JSON format (no markdown, no explanation):
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
//  2. AUTO-PRIORITY SCORING
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
    if (!result) return "MEDIUM";
    const cleaned = result.toUpperCase().replace(/[^A-Z]/g, "");
    return ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(cleaned) ? cleaned : "MEDIUM";
}

// =============================================================
//  3. AUTO-CATEGORY DETECTION
// =============================================================
const CAMPUS_CATEGORIES = ["Electricity","Water","Cleanliness","Infrastructure","Wi-Fi / Internet","Security","Other"];

async function detectCategory(title, description) {
    const prompt = `You are a campus issue classification system. Classify this issue into the most appropriate category.

Title: ${title}
Description: ${description}

Available categories: ${CAMPUS_CATEGORIES.join(", ")}

Respond ONLY in this exact JSON format (no markdown):
{"categoryName": "<exact category name from the list>", "confidence": "HIGH"/"MEDIUM"/"LOW"}`;
    const raw = await ask(prompt);
    if (!raw) return { categoryName: null, confidence: "LOW" };
    try {
        const cleaned = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        const match = CAMPUS_CATEGORIES.find((c) => c.toLowerCase() === (parsed.categoryName||"").toLowerCase());
        return { categoryName: match || null, confidence: parsed.confidence || "LOW" };
    } catch { return { categoryName: null, confidence: "LOW" }; }
}

// =============================================================
//  4. AI ISSUE SUMMARY
// =============================================================
async function summariseIssues(issues) {
    if (!issues.length) return null;
    const reports = issues.map((i, idx) => `Report ${idx + 1}: ${i.title} - ${(i.description||"").slice(0, 120)}`).join("\n");
    const prompt = `Summarise these campus issue reports into ONE clear concise sentence (max 30 words) describing the core problem:\n${reports}\n\nRespond with ONLY the summary sentence.`;
    return await ask(prompt);
}

module.exports = { detectDuplicate, scorePriority, detectCategory, summariseIssues, isEnabled: () => Boolean(process.env.GEMINI_API_KEY) };
