
// =============================================================
// backend/ai/gemini.js
// Central AI service - all Gemini calls go through here
// =============================================================

const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI = null;
let model = null;

// =============================================================
// GET GEMINI MODEL
// =============================================================

function getModel() {
    if (!process.env.GEMINI_API_KEY) {
        console.error("[Gemini] GEMINI_API_KEY is missing");
        return null;
    }

    if (!model) {
        genAI = new GoogleGenerativeAI(
            process.env.GEMINI_API_KEY
        );

        model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
        });
    }

    return model;
}

// =============================================================
// COMMON GEMINI CALL
// =============================================================

async function ask(prompt) {
    const m = getModel();

    if (!m) {
        return null;
    }

    try {
        const result = await m.generateContent(prompt);

        const text = result?.response?.text?.();

        if (!text) {
            console.error("[Gemini] Empty response");
            return null;
        }

        return text.trim();

    } catch (err) {
        console.error("[Gemini] API error:", err.message);
        return null;
    }
}

// =============================================================
// 1. SEMANTIC DUPLICATE DETECTION
// =============================================================

async function detectDuplicate(newIssue, existingIssues) {

    if (
        !Array.isArray(existingIssues) ||
        existingIssues.length === 0
    ) {
        return {
            isDuplicate: false,
            matchedIssueId: null,
            confidence: "LOW",
        };
    }

    const existingList = existingIssues
        .map((issue) => {
            return `
ID: ${issue.issue_id}
Title: ${issue.title}
Location: ${issue.location}
Description: ${(issue.description || "").slice(0, 500)}
`;
        })
        .join("\n-------------------------\n");

    const prompt = `
You are a STRICT duplicate complaint detector for a college campus.

Your task is to compare ONE NEW COMPLAINT with EXISTING OPEN COMPLAINTS.

A complaint is a DUPLICATE only if it describes the SAME real-world
problem at the SAME or clearly equivalent physical location.

========================
NEW COMPLAINT
========================

Title:
${newIssue.title}

Location:
${newIssue.location}

Description:
${newIssue.description}


========================
EXISTING OPEN COMPLAINTS
========================

${existingList}


========================
STRICT RULES
========================

RULE 1:
Same problem + same location = DUPLICATE.

RULE 2:
Same problem + clearly equivalent location = DUPLICATE.

RULE 3:
Different location = NOT DUPLICATE.

RULE 4:
Different physical problem = NOT DUPLICATE.

RULE 5:
Ignore wording differences when the actual problem is clearly the same.

RULE 6:
Do NOT mark a complaint duplicate just because both contain common
words such as:
"problem", "issue", "broken", "not working", "campus", "room".

RULE 7:
The actual problem must be semantically the same.

RULE 8:
Location is VERY IMPORTANT.

Different:
- buildings
- rooms
- blocks
- labs
- areas
- facilities

usually means NOT DUPLICATE.

RULE 9:
If location is missing or unclear, prefer NOT DUPLICATE.

RULE 10:
If you are uncertain, return NOT DUPLICATE.

RULE 11:
You may ONLY select an issue ID that appears in the EXISTING OPEN
COMPLAINTS list.

RULE 12:
Never invent an issue ID.

RULE 13:
Return only ONE best matching complaint.

RULE 14:
Same category does NOT automatically mean duplicate.

========================
EXAMPLES
========================

Example 1:

NEW:
Title: WiFi not working
Location: Library
Description: Internet has stopped working.

EXISTING:
Title: Internet connection down
Location: Library
Description: Students cannot access WiFi.

ANSWER:
DUPLICATE.


Example 2:

NEW:
Title: Fan not working
Location: Computer Lab
Description: Ceiling fan is broken.

EXISTING:
Title: Fan not working
Location: Library
Description: Library fan is broken.

ANSWER:
NOT DUPLICATE.


Example 3:

NEW:
Title: Water leakage
Location: Block A
Description: Water is leaking from the ceiling.

EXISTING:
Title: Water leaking from ceiling
Location: Block A
Description: Ceiling has a water leak.

ANSWER:
DUPLICATE.


Example 4:

NEW:
Title: Broken chair
Location: Block A
Description: Chair is damaged.

EXISTING:
Title: Broken chair
Location: Block B
Description: Chair is damaged.

ANSWER:
NOT DUPLICATE.


Example 5:

NEW:
Title: Fan not working
Location: Library
Description: Ceiling fan has stopped.

EXISTING:
Title: Water leakage
Location: Library
Description: Water is leaking from the ceiling.

ANSWER:
NOT DUPLICATE.


Example 6:

NEW:
Title: Internet slow
Location: Library
Description: WiFi is very slow.

EXISTING:
Title: WiFi not working
Location: Library
Description: Students cannot connect to WiFi.

ANSWER:
DUPLICATE only if the existing complaint clearly represents the
same ongoing internet service problem.


========================
OUTPUT
========================

Return ONLY valid JSON.

If duplicate:

{
    "isDuplicate": true,
    "matchedIssueId": EXISTING_ID,
    "confidence": "HIGH"
}

If not duplicate:

{
    "isDuplicate": false,
    "matchedIssueId": null,
    "confidence": "LOW"
}

Confidence must be exactly one of:

HIGH
MEDIUM
LOW

Do not return explanations.
Do not return markdown.
Do not return multiple matches.
`;

    const raw = await ask(prompt);

    if (!raw) {
        console.error(
            "[Gemini] Duplicate detection failed"
        );

        return {
            isDuplicate: false,
            matchedIssueId: null,
            confidence: "LOW",
            aiError: true,
        };
    }

    try {

        const cleaned = raw
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        const parsed = JSON.parse(cleaned);

        const confidence = String(
            parsed.confidence || "LOW"
        ).toUpperCase();

        const matchedIssueId =
            parsed.matchedIssueId !== null &&
            parsed.matchedIssueId !== undefined
                ? parsed.matchedIssueId
                : null;

        // -----------------------------------------------------
        // SAFETY CHECK
        // Make sure returned ID really exists.
        // -----------------------------------------------------

        const validMatch = existingIssues.find(
            (issue) =>
                String(issue.issue_id) ===
                String(matchedIssueId)
        );

        // AI says duplicate but selected an invalid ID
        if (
            Boolean(parsed.isDuplicate) &&
            !validMatch
        ) {
            console.warn(
                "[Gemini] Invalid matched issue ID:",
                matchedIssueId
            );

            return {
                isDuplicate: false,
                matchedIssueId: null,
                confidence: "LOW",
            };
        }

        return {
            isDuplicate:
                Boolean(parsed.isDuplicate) &&
                Boolean(validMatch),

            matchedIssueId:
                parsed.isDuplicate && validMatch
                    ? validMatch.issue_id
                    : null,

            confidence:
                ["HIGH", "MEDIUM", "LOW"].includes(
                    confidence
                )
                    ? confidence
                    : "LOW",
        };

    } catch (err) {

        console.error(
            "[Gemini] Invalid duplicate JSON:",
            raw
        );

        return {
            isDuplicate: false,
            matchedIssueId: null,
            confidence: "LOW",
            aiError: true,
        };
    }
}

// =============================================================
// 2. AUTO PRIORITY
// =============================================================

async function scorePriority(
    title,
    description,
    category
) {

    const prompt = `
You are a college campus complaint priority classifier.

Title:
${title}

Category:
${category || "General"}

Description:
${description}

Choose exactly ONE priority.

CRITICAL = immediate safety hazard, serious health risk,
or complete service outage affecting many people.

HIGH = significant disruption to normal campus activities.

MEDIUM = normal inconvenience.

LOW = minor or cosmetic issue.

Return ONLY one word:

CRITICAL
HIGH
MEDIUM
LOW
`;

    const result = await ask(prompt);

    if (!result) {
        return "MEDIUM";
    }

    const cleaned = result
        .toUpperCase()
        .replace(/[^A-Z]/g, "");

    if (
        ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(
            cleaned
        )
    ) {
        return cleaned;
    }

    return "MEDIUM";
}

// =============================================================
// 3. AUTO CATEGORY
// =============================================================

const CAMPUS_CATEGORIES = [
    "Electricity",
    "Water",
    "Cleanliness",
    "Infrastructure",
    "Wi-Fi / Internet",
    "Security",
    "Other",
];

async function detectCategory(
    title,
    description
) {

    const prompt = `
Classify this college campus complaint.

Title:
${title}

Description:
${description}

Available categories:

${CAMPUS_CATEGORIES.join(", ")}

Return ONLY JSON:

{
    "categoryName": "exact category name",
    "confidence": "HIGH"
}
`;

    const raw = await ask(prompt);

    if (!raw) {
        return {
            categoryName: null,
            confidence: "LOW",
        };
    }

    try {

        const cleaned = raw
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        const parsed = JSON.parse(cleaned);

        const categoryName = String(
            parsed.categoryName || ""
        ).trim();

        const matchedCategory =
            CAMPUS_CATEGORIES.find(
                (category) =>
                    category.toLowerCase() ===
                    categoryName.toLowerCase()
            );

        return {
            categoryName:
                matchedCategory || null,

            confidence:
                ["HIGH", "MEDIUM", "LOW"].includes(
                    String(
                        parsed.confidence
                    ).toUpperCase()
                )
                    ? String(
                        parsed.confidence
                    ).toUpperCase()
                    : "LOW",
        };

    } catch (err) {

        console.error(
            "[Gemini] Category JSON error:",
            err.message
        );

        return {
            categoryName: null,
            confidence: "LOW",
        };
    }
}

// =============================================================
// 4. ISSUE SUMMARY
// =============================================================

async function summariseIssues(issues) {

    if (
        !Array.isArray(issues) ||
        issues.length === 0
    ) {
        return null;
    }

    const reports = issues
        .map(
            (issue, index) =>
                `Report ${index + 1}: ${issue.title} - ${
                    issue.description || ""
                }`
        )
        .join("\n");

    const prompt = `
Summarise these college campus complaints into ONE
clear sentence of maximum 30 words.

${reports}

Return ONLY the summary sentence.
`;

    return await ask(prompt);
}

// =============================================================
// EXPORTS
// =============================================================

module.exports = {
    detectDuplicate,
    scorePriority,
    detectCategory,
    summariseIssues,

    isEnabled: () =>
        Boolean(process.env.GEMINI_API_KEY),
};

