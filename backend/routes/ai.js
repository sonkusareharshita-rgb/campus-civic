
// =============================================================
// backend/routes/ai.js  ·  Campus Civic AI Endpoints
// =============================================================

const express = require("express");
const pool    = require("../db");
const ai      = require("../ai/gemini");

const router  = express.Router();

// ── Guard: all routes require AI to be enabled ──────────────

function requireAI(req, res, next) {
    if (!ai.isEnabled()) {
        return res.status(503).json({
            success: false,
            message: "AI features are not configured. Add GEMINI_API_KEY to .env",
        });
    }
    next();
}

// =============================================================
// POST /api/ai/validate
// Quality-gate: check issue before submission
// Body: { title, description, location }
// =============================================================

router.post("/validate", requireAI, async (req, res) => {
    const { title, description, location } = req.body || {};

    if (!title || !description) {
        return res.status(400).json({ success: false, message: "title and description required" });
    }

    try {
        const result = await ai.validateIssue(title, description, location || "");
        return res.json({ success: true, ...result });
    } catch (err) {
        console.error("[AI] validate error:", err.message);
        return res.json({ success: true, isValid: true, issues: [], suggestion: null }); // fail open
    }
});

// =============================================================
// POST /api/ai/sentiment
// Analyse tone & urgency of an issue
// Body: { title, description }
// =============================================================

router.post("/sentiment", requireAI, async (req, res) => {
    const { title, description } = req.body || {};

    if (!title || !description) {
        return res.status(400).json({ success: false, message: "title and description required" });
    }

    try {
        const result = await ai.analyseSentiment(title, description);
        return res.json({ success: true, ...result });
    } catch (err) {
        console.error("[AI] sentiment error:", err.message);
        return res.status(500).json({ success: false, message: "Sentiment analysis failed" });
    }
});

// =============================================================
// POST /api/ai/resolution/:issueId
// Smart resolution guide for admin
// =============================================================

router.post("/resolution/:issueId", requireAI, async (req, res) => {
    const { issueId } = req.params;

    try {
        const result = await pool.query(
            `SELECT i.title, i.description, i.priority, i.status,
                    c.category_name
             FROM issues i
             LEFT JOIN categories c ON c.category_id = i.category_id
             WHERE i.issue_id = $1`,
            [issueId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Issue not found" });
        }

        const issue      = result.rows[0];
        const suggestion = await ai.suggestResolution(
            issue.title,
            issue.description,
            issue.category_name,
            issue.priority
        );

        return res.json({ success: true, resolution: suggestion });
    } catch (err) {
        console.error("[AI] resolution error:", err.message);
        return res.status(500).json({ success: false, message: "Resolution suggestion failed" });
    }
});

// =============================================================
// POST /api/ai/search
// Natural language search → structured filters + results
// Body: { query }
// =============================================================

router.post("/search", requireAI, async (req, res) => {
    const { query } = req.body || {};

    if (!query || query.trim().length < 2) {
        return res.status(400).json({ success: false, message: "query required (min 2 chars)" });
    }

    try {
        // Parse the NLP query into filters
        const filters = await ai.nlpSearch(query.trim());

        // Build dynamic SQL from filters
        const conditions = [];
        const params     = [];
        let   idx        = 1;

        if (filters.keywords && filters.keywords.length > 0) {
            const kwConditions = filters.keywords.map(() => {
                const i = idx++;
                params.push(`%${filters.keywords[i - 1]}%`);
                return `(i.title ILIKE $${i} OR i.description ILIKE $${i} OR i.location ILIKE $${i})`;
            });
            conditions.push(`(${kwConditions.join(" OR ")})`);
        }

        if (filters.category) {
            params.push(filters.category);
            conditions.push(`c.category_name ILIKE $${idx++}`);
        }

        if (filters.status) {
            params.push(filters.status);
            conditions.push(`i.status = $${idx++}`);
        }

        if (filters.priority) {
            params.push(filters.priority);
            conditions.push(`i.priority = $${idx++}`);
        }

        if (filters.location) {
            params.push(`%${filters.location}%`);
            conditions.push(`i.location ILIKE $${idx++}`);
        }

        const where = conditions.length > 0
            ? "WHERE " + conditions.join(" AND ")
            : "";

        const sql = `
            SELECT
                i.issue_id, i.title, i.description, i.location,
                i.status, i.priority, i.created_at,
                i.report_count,
                c.category_name,
                u.full_name AS reported_by_name
            FROM issues i
            LEFT JOIN categories c ON c.category_id = i.category_id
            LEFT JOIN users      u ON u.user_id      = i.reported_by
            ${where}
            ORDER BY i.created_at DESC
            LIMIT 20
        `;

        const dbResult = await pool.query(sql, params);

        return res.json({
            success:  true,
            filters,
            results:  dbResult.rows,
            count:    dbResult.rows.length,
        });
    } catch (err) {
        console.error("[AI] search error:", err.message);
        return res.status(500).json({ success: false, message: "AI search failed" });
    }
});

// =============================================================
// GET /api/ai/escalate/:issueId
// Check if a specific issue should be escalated
// =============================================================

router.get("/escalate/:issueId", requireAI, async (req, res) => {
    const { issueId } = req.params;

    try {
        const result = await pool.query(
            `SELECT i.*, c.category_name
             FROM issues i
             LEFT JOIN categories c ON c.category_id = i.category_id
             WHERE i.issue_id = $1`,
            [issueId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Issue not found" });
        }

        const check = await ai.shouldEscalate(result.rows[0]);
        return res.json({ success: true, issueId: Number(issueId), ...check });
    } catch (err) {
        console.error("[AI] escalate check error:", err.message);
        return res.status(500).json({ success: false, message: "Escalation check failed" });
    }
});

// =============================================================
// GET /api/ai/escalate-scan
// Scan ALL open/in-progress issues and return escalation candidates
// =============================================================

router.get("/escalate-scan", requireAI, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT i.*, c.category_name
            FROM issues i
            LEFT JOIN categories c ON c.category_id = i.category_id
            WHERE i.status IN ('SUBMITTED','PENDING','VERIFIED','IN_PROGRESS')
            ORDER BY i.priority ASC, i.created_at ASC
            LIMIT 30
        `);

        const candidates = [];

        // Check escalation for up to 10 issues (to save API quota)
        const toCheck = result.rows.slice(0, 10);
        for (const issue of toCheck) {
            const check = await ai.shouldEscalate(issue);
            if (check.shouldEscalate) {
                candidates.push({
                    issue_id:    issue.issue_id,
                    title:       issue.title,
                    priority:    issue.priority,
                    status:      issue.status,
                    location:    issue.location,
                    category:    issue.category_name,
                    reason:      check.reason,
                    escalateTo:  check.escalateTo,
                });
            }
        }

        return res.json({ success: true, candidates, scanned: toCheck.length });
    } catch (err) {
        console.error("[AI] escalate-scan error:", err.message);
        return res.status(500).json({ success: false, message: "Escalation scan failed" });
    }
});

// =============================================================
// GET /api/ai/trends
// Detect trends and hotspots from recent issues
// =============================================================

router.get("/trends", requireAI, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT i.issue_id, i.title, i.location, i.status, i.priority,
                   i.report_count, i.created_at, c.category_name
            FROM issues i
            LEFT JOIN categories c ON c.category_id = i.category_id
            WHERE i.created_at >= NOW() - INTERVAL '30 days'
            ORDER BY i.created_at DESC
            LIMIT 50
        `);

        const analysis = await ai.detectTrends(result.rows);
        return res.json({ success: true, ...analysis, issueCount: result.rows.length });
    } catch (err) {
        console.error("[AI] trends error:", err.message);
        return res.status(500).json({ success: false, message: "Trend analysis failed" });
    }
});

// =============================================================
// GET /api/ai/digest
// Generate admin digest (stats + AI narrative)
// =============================================================

router.get("/digest", requireAI, async (req, res) => {
    try {
        // Pull stats
        const statsResult = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE status NOT IN ('RESOLVED','CLOSED','REJECTED'))      AS pending,
                COUNT(*) FILTER (WHERE priority = 'CRITICAL'
                                   AND status NOT IN ('RESOLVED','CLOSED','REJECTED'))      AS critical,
                COUNT(*) FILTER (WHERE status = 'RESOLVED'
                                   AND updated_at >= CURRENT_DATE)                         AS resolved_today,
                COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)                         AS new_today,
                ROUND(
                    100.0 * COUNT(*) FILTER (WHERE status = 'RESOLVED')
                    / NULLIF(COUNT(*), 0), 1
                )                                                                           AS resolution_rate
            FROM issues
        `);

        const recentResult = await pool.query(`
            SELECT i.title, i.location, i.priority, i.status, c.category_name
            FROM issues i
            LEFT JOIN categories c ON c.category_id = i.category_id
            WHERE i.status NOT IN ('RESOLVED','CLOSED','REJECTED')
            ORDER BY
                CASE i.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2
                                WHEN 'MEDIUM' THEN 3 ELSE 4 END,
                i.created_at ASC
            LIMIT 5
        `);

        const stats  = statsResult.rows[0];
        const digest = await ai.generateAdminDigest(stats, recentResult.rows);

        return res.json({
            success: true,
            stats,
            digest,
            generated_at: new Date().toISOString(),
        });
    } catch (err) {
        console.error("[AI] digest error:", err.message);
        return res.status(500).json({ success: false, message: "Digest generation failed" });
    }
});

// =============================================================
// POST /api/ai/category-suggest
// Real-time category suggestion as user types (used in ReportIssue)
// Body: { title, description }
// =============================================================

router.post("/category-suggest", requireAI, async (req, res) => {
    const { title, description } = req.body || {};
    if (!title) return res.status(400).json({ success: false, message: "title required" });

    try {
        const result = await ai.detectCategory(title, description || "");
        return res.json({ success: true, ...result });
    } catch (err) {
        console.error("[AI] category-suggest error:", err.message);
        return res.status(500).json({ success: false, message: "Category suggestion failed" });
    }
});

// =============================================================
// POST /api/ai/priority-suggest
// Real-time priority suggestion (used in ReportIssue)
// Body: { title, description, category }
// =============================================================

router.post("/priority-suggest", requireAI, async (req, res) => {
    const { title, description, category } = req.body || {};
    if (!title) return res.status(400).json({ success: false, message: "title required" });

    try {
        const priority = await ai.scorePriority(title, description || "", category || "");
        return res.json({ success: true, priority });
    } catch (err) {
        console.error("[AI] priority-suggest error:", err.message);
        return res.status(500).json({ success: false, message: "Priority suggestion failed" });
    }
});

// =============================================================
// GET /api/ai/status
// Check if AI is enabled and working
// =============================================================

router.get("/status", (req, res) => {
    res.json({
        success: true,
        enabled: ai.isEnabled(),
        model:   "gemini-flash-latest",
        features: [
            "duplicate-detection",
            "auto-priority",
            "auto-category",
            "quality-gate",
            "sentiment-analysis",
            "resolution-suggestions",
            "nlp-search",
            "auto-escalation",
            "trend-detection",
            "admin-digest",
        ],
    });
});

// =============================================================
// POST /api/ai/duplicate-check
// Post-submit: find similar existing issues
// Body: { title, description, location, excludeId? }
//
// Strategy (scales to millions of rows):
//   Phase 1 — DB pre-filter: same location + open/in-progress,
//             last 90 days, max 150 rows  → fast index scan
//   Phase 2 — Gemini semantic match on those ≤150 candidates
// =============================================================

router.post("/duplicate-check", requireAI, async (req, res) => {
    const { title, description, location, excludeId } = req.body || {};

    if (!title || !description) {
        return res.status(400).json({ success: false, message: "title and description required" });
    }

    try {
        // ── Phase 1: DB pre-filter ────────────────────────────
        let query = `
            SELECT issue_id, title, description, location, status, created_at
            FROM issues
            WHERE status IN ('open','in-progress')
              AND created_at >= NOW() - INTERVAL '90 days'
        `;
        const params = [];

        if (location) {
            // Using LIKE instead of strict equality so that base locations still match if extra detail differs
            params.push(`${location.split(' — ')[0]}%`);
            query += ` AND location LIKE $${params.length}`;
        }

        if (excludeId) {
            params.push(excludeId);
            query += ` AND issue_id != $${params.length}`;
        }

        query += ` ORDER BY created_at DESC LIMIT 150`;

        const { rows: candidates } = await pool.query(query, params);

        if (!candidates.length) {
            return res.json({ isDuplicate: false, existingIssue: null, candidates: 0 });
        }

        // ── Phase 2: Gemini semantic similarity ───────────────
        const candidateList = candidates
            .map(r => `ID:${r.issue_id} | Title: ${r.title} | Desc: ${r.description}`)
            .join("\n");

        const prompt = `
You are a duplicate-issue detector for a campus complaint system.

NEW REPORT:
Title: "${title}"
Description: "${description}"

EXISTING OPEN ISSUES (max 150, pre-filtered by location):
${candidateList}

Task: Find the MOST semantically similar existing issue to the new report.
Rules:
- Similarity means same real-world problem, not just keyword overlap
- A 70%+ similarity score = duplicate

Respond ONLY with valid JSON (no markdown):
{
  "isDuplicate": true/false,
  "matchedId": <issue_id number or null>,
  "similarity": <0-100 integer>,
  "reason": "<one sentence why>"
}
`;

        const raw = await ai.callGemini(prompt);

        // Parse JSON from response
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return res.json({ isDuplicate: false, existingIssue: null, candidates: candidates.length });
        }

        const result = JSON.parse(jsonMatch[0]);

        if (result.isDuplicate && result.matchedId) {
            const matched = candidates.find(c => c.issue_id === result.matchedId);
            return res.json({
                isDuplicate: true,
                existingIssue: matched || null,
                similarity: result.similarity,
                reason: result.reason,
                candidates: candidates.length,
            });
        }

        return res.json({ isDuplicate: false, existingIssue: null, candidates: candidates.length });

    } catch (err) {
        console.error("[AI] duplicate-check error:", err.message);
        return res.json({ isDuplicate: false, existingIssue: null, candidates: 0 });
    }
});

module.exports = router;
