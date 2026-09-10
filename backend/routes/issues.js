const express = require("express");
const pool = require("../db");
const ai = require("../ai/gemini");

const router = express.Router();

console.log("ISSUES ROUTER FILE LOADED");


// =====================================================
// TEST ROUTE
// =====================================================

router.get("/test", (req, res) => {
    res.json({
        message: "Issues router is working"
    });
});


// =====================================================
// CREATE ISSUE
// POST /api/issues
// =====================================================

router.post("/", async (req, res) => {

    console.log("POST /api/issues ROUTE HIT");

    try {

        const {
            reported_by,
            category_id,
            department_id,
            title,
            description,
            location,
            image_url,
            priority,
            force_create
        } = req.body;


        // -------------------------------------------------
        // REQUIRED FIELD VALIDATION
        // -------------------------------------------------

        if (
            !reported_by ||
            !category_id ||
            !title ||
            !description ||
            !location
        ) {

            return res.status(400).json({
                message:
                    "reported_by, category_id, title, description and location are required"
            });

        }


        // -------------------------------------------------
        // DUPLICATE COMPLAINT CHECK (AI + SQL fallback)
        // -------------------------------------------------

        if (!force_create) {

            // Fetch open issues for AI comparison
            const openResult = await pool.query(
                `SELECT i.issue_id, i.title, i.description, i.location,
                        i.status, i.priority, i.created_at,
                        c.category_name
                 FROM issues i
                 JOIN categories c ON i.category_id = c.category_id
                 WHERE i.status IN ('PENDING', 'IN_PROGRESS')
                 ORDER BY i.created_at DESC
                 LIMIT 50`
            );

            let duplicateInfo = null;

            // Try AI-powered detection first
            if (ai.isEnabled() && openResult.rows.length > 0) {
                duplicateInfo = await ai.detectDuplicate(
                    { title, description, location },
                    openResult.rows
                );
            }

            // Fallback to SQL if AI is disabled or returned nothing
            if (!duplicateInfo || (!duplicateInfo.isDuplicate && !ai.isEnabled())) {
                const sqlDup = await pool.query(
                    `SELECT i.issue_id, i.title, i.description, i.location,
                            i.status, i.priority, i.created_at, c.category_name
                     FROM issues i
                     JOIN categories c ON i.category_id = c.category_id
                     WHERE i.category_id = $1
                       AND LOWER(TRIM(i.location)) = LOWER(TRIM($2))
                       AND i.status IN ('PENDING', 'IN_PROGRESS')
                       AND (LOWER(i.title) LIKE '%' || LOWER($3) || '%'
                            OR LOWER($3) LIKE '%' || LOWER(i.title) || '%')
                     ORDER BY i.created_at DESC
                     LIMIT 1`,
                    [category_id, location, title]
                );
                if (sqlDup.rows.length > 0) {
                    duplicateInfo = {
                        isDuplicate: true,
                        matchedIssueId: sqlDup.rows[0].issue_id,
                        confidence: "HIGH",
                    };
                }
            }

            if (duplicateInfo && duplicateInfo.isDuplicate) {
                // Find the matched issue details
                const matchRow = openResult.rows.find(
                    (r) => r.issue_id === duplicateInfo.matchedIssueId
                );

                return res.status(409).json({
                    duplicate: true,
                    message: "A similar complaint already exists.",
                    ai_confidence: duplicateInfo.confidence || null,
                    existing_issue: matchRow || { issue_id: duplicateInfo.matchedIssueId },
                });
            }

        }


        // -------------------------------------------------
        // AI AUTO-PRIORITY (if user didn't specify)
        // -------------------------------------------------

        let finalPriority = priority || "MEDIUM";

        if (!priority && ai.isEnabled()) {
            finalPriority = await ai.scorePriority(title, description, null);
            console.log("[AI] Auto-priority:", finalPriority);
        }


        // -------------------------------------------------
        // AI AUTO-CATEGORY SUGGESTION (logged, not overriding)
        // -------------------------------------------------

        let aiCategory = null;
        if (ai.isEnabled()) {
            aiCategory = await ai.detectCategory(title, description);
            console.log("[AI] Suggested category:", aiCategory);
        }


        // -------------------------------------------------
        // CREATE NEW ISSUE
        // -------------------------------------------------

        const result = await pool.query(
            `
            INSERT INTO issues
            (
                reported_by,
                category_id,
                department_id,
                title,
                description,
                location,
                image_url,
                priority
            )

            VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8)

            RETURNING *
            `,
            [
                reported_by,
                category_id,
                department_id || null,
                title,
                description,
                location,
                image_url || null,
                finalPriority
            ]
        );


        console.log(
            "Issue created:",
            result.rows[0]
        );


        res.status(201).json({

            duplicate: false,

            message:
                "Issue created successfully",

            issue:
                result.rows[0],

            ai: {
                priority_auto: !priority ? finalPriority : null,
                suggested_category: aiCategory,
                ai_enabled: ai.isEnabled(),
            }

        });


    } catch (error) {

        console.error(
            "Create issue error:",
            error
        );


        res.status(500).json({

            message:
                "Server error",

            error:
                error.message

        });

    }

});


// =====================================================
// AI REAL-TIME ANALYSIS (before submit)
// POST /api/issues/analyze
// =====================================================

router.post("/analyze", async (req, res) => {

    if (!ai.isEnabled()) {
        return res.json({
            ai_enabled: false,
            message: "AI features are disabled. Set GEMINI_API_KEY in .env to enable.",
        });
    }

    try {
        const { title, description, location } = req.body;

        if (!title || !description) {
            return res.status(400).json({ message: "title and description are required" });
        }

        // Fetch open issues for duplicate detection
        const openResult = await pool.query(
            `SELECT i.issue_id, i.title, i.description, i.location
             FROM issues i
             WHERE i.status IN ('PENDING', 'IN_PROGRESS')
             ORDER BY i.created_at DESC
             LIMIT 50`
        );

        const analysis = await ai.analyzeIssue(
            title,
            description,
            location || "",
            openResult.rows
        );

        res.json({
            ai_enabled: true,
            suggested_priority: analysis.suggested_priority,
            suggested_category: analysis.suggested_category,
            duplicate_check: analysis.duplicate_check,
        });

    } catch (error) {
        console.error("[AI] Analyze error:", error);
        res.status(500).json({ message: "AI analysis failed", error: error.message });
    }

});


// =====================================================
// AI STATUS CHECK
// GET /api/issues/ai-status
// =====================================================

router.get("/ai-status", (req, res) => {
    res.json({ ai_enabled: ai.isEnabled() });
});


// =====================================================
// SUPPORT EXISTING COMPLAINT
// POST /api/issues/:issueId/support
// =====================================================


router.post("/:issueId/support", async (req, res) => {

    try {

        const { issueId } = req.params;

        const { reported_by } = req.body;


        if (!reported_by) {

            return res.status(400).json({

                message:
                    "reported_by is required"

            });

        }


        // Check complaint exists

        const issueResult = await pool.query(
            `
            SELECT *
            FROM issues
            WHERE issue_id = $1
            `,
            [issueId]
        );


        if (issueResult.rows.length === 0) {

            return res.status(404).json({

                message:
                    "Complaint not found"

            });

        }


        // -------------------------------------------------
        // CHECK IF USER ALREADY SUPPORTED THIS COMPLAINT
        // -------------------------------------------------

        const existingSupport =
            await pool.query(
                `
                SELECT *
                FROM issue_supporters
                WHERE issue_id = $1
                AND user_id = $2
                `,
                [
                    issueId,
                    reported_by
                ]
            );


        if (existingSupport.rows.length > 0) {

            return res.status(409).json({

                message:
                    "You have already reported this issue."

            });

        }


        // -------------------------------------------------
        // ADD SUPPORTER
        // -------------------------------------------------

        await pool.query(
            `
            INSERT INTO issue_supporters
            (
                issue_id,
                user_id
            )

            VALUES
            ($1, $2)
            `,
            [
                issueId,
                reported_by
            ]
        );


        // -------------------------------------------------
        // GET NEW COUNT
        // -------------------------------------------------

        const countResult =
            await pool.query(
                `
                SELECT COUNT(*) AS report_count
                FROM issue_supporters
                WHERE issue_id = $1
                `,
                [issueId]
            );


        res.status(200).json({

            message:
                "Complaint supported successfully",

            issue_id:
                issueId,

            report_count:
                Number(
                    countResult.rows[0].report_count
                )

        });


    } catch (error) {

        console.error(
            "Support complaint error:",
            error
        );


        res.status(500).json({

            message:
                "Failed to support complaint",

            error:
                error.message

        });

    }

});


// =====================================================
// GET ALL ISSUES
// GET /api/issues/all
// =====================================================

router.get("/all", async (req, res) => {

    console.log(
        "GET /api/issues ROUTE HIT"
    );


    try {

        const result = await pool.query(
            `
            SELECT

                i.issue_id,
                i.reported_by,
                i.category_id,
                i.department_id,
                i.title,
                i.description,
                i.location,
                i.image_url,
                i.priority,
                i.status,
                i.created_at,
                i.updated_at,
                i.assigned_to,
                i.resolution_note,
                i.resolution_image_url,
                i.resolved_at,

                u.name AS reported_by_name,
                u.email AS reported_by_email,

                c.category_name,

                d.department_name,

                COUNT(s.user_id)
                    AS report_count


            FROM issues i


            JOIN users u
                ON i.reported_by = u.user_id


            JOIN categories c
                ON i.category_id = c.category_id


            LEFT JOIN departments d
                ON i.department_id =
                   d.department_id


            LEFT JOIN issue_supporters s
                ON i.issue_id =
                   s.issue_id


            GROUP BY

                i.issue_id,
                u.name,
                u.email,
                c.category_name,
                d.department_name


            ORDER BY
                i.created_at DESC
            `
        );


        console.log(
            "Issues fetched:",
            result.rows.length
        );


        res.status(200).json({

            message:
                "Issues fetched successfully",

            count:
                result.rows.length,

            issues:
                result.rows

        });


    } catch (error) {

        console.error(
            "Get issues error:",
            error
        );


        res.status(500).json({

            message:
                "Failed to fetch issues",

            error:
                error.message

        });

    }

});


// =====================================================
// GET SINGLE ISSUE
// GET /api/issues/:id
// =====================================================

router.get("/:id", async (req, res) => {

    const { id } = req.params;

    try {

        const result = await pool.query(
            `
            SELECT
                i.issue_id,
                i.reported_by,
                i.category_id,
                i.department_id,
                i.title,
                i.description,
                i.location,
                i.image_url,
                i.priority,
                i.status,
                i.created_at,
                i.updated_at,
                i.assigned_to,
                i.resolution_note,
                i.resolution_image_url,

                u.name  AS reported_by_name,
                u.email AS reported_by_email,

                c.category_name,

                d.department_name,

                COUNT(s.user_id) AS report_count

            FROM issues i

            JOIN users u
                ON i.reported_by = u.user_id

            JOIN categories c
                ON i.category_id = c.category_id

            LEFT JOIN departments d
                ON i.department_id = d.department_id

            LEFT JOIN issue_supporters s
                ON i.issue_id = s.issue_id

            WHERE i.issue_id = $1

            GROUP BY
                i.issue_id,
                u.name,
                u.email,
                c.category_name,
                d.department_name
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Issue not found"
            });
        }

        res.status(200).json({
            message: "Issue fetched successfully",
            issue:   result.rows[0]
        });

    } catch (error) {

        console.error("Get single issue error:", error);

        res.status(500).json({
            message: "Failed to fetch issue",
            error:   error.message
        });
    }

});


// =====================================================
// UPDATE ISSUE STATUS (ADMIN)
// PUT /api/issues/:id/status
// =====================================================

router.put("/:id/status", async (req, res) => {

    const { id } = req.params;

    const {
        status,
        resolution_note,
        resolution_image_url,
        changed_by
    } = req.body;

    // ── VALIDATE STATUS ──────────────────────────
    const VALID_STATUSES = [
        "PENDING",
        "APPROVED",
        "IN_PROGRESS",
        "RESOLVED",
        "REJECTED"
    ];

    if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({
            message: `Status must be one of: ${VALID_STATUSES.join(", ")}`
        });
    }

    if (status === "RESOLVED" && !resolution_note?.trim()) {
        return res.status(400).json({
            message: "A resolution note is required when marking an issue as RESOLVED"
        });
    }

    try {

        // ── GET CURRENT STATUS (for audit trail) ──
        const current = await pool.query(
            `SELECT status FROM issues WHERE issue_id = $1`,
            [id]
        );

        if (current.rows.length === 0) {
            return res.status(404).json({
                message: "Issue not found"
            });
        }

        const oldStatus = current.rows[0].status;

        // ── UPDATE ISSUE ─────────────────────────
        const updated = await pool.query(
            `
            UPDATE issues
            SET
                status               = $1,
                resolution_note      = $2,
                resolution_image_url = $3,
                updated_at           = NOW()
            WHERE issue_id = $4
            RETURNING *
            `,
            [
                status,
                resolution_note      || null,
                resolution_image_url || null,
                id
            ]
        );

        // ── WRITE AUDIT TRAIL ────────────────────
        await pool.query(
            `
            INSERT INTO issue_status_history
                (issue_id, old_status, new_status, changed_by, note)
            VALUES
                ($1, $2, $3, $4, $5)
            `,
            [
                id,
                oldStatus,
                status,
                changed_by || null,
                resolution_note || null
            ]
        );

        res.status(200).json({
            message: `Issue status updated to ${status}`,
            issue:   updated.rows[0]
        });

    } catch (error) {

        console.error("Update issue status error:", error);

        res.status(500).json({
            message: "Failed to update issue status",
            error:   error.message
        });
    }

});


// =====================================================
// GET COMMENTS FOR AN ISSUE
// GET /api/issues/:id/comments
// =====================================================

router.get("/:id/comments", async (req, res) => {

    const { id } = req.params;

    try {

        const result = await pool.query(
            `
            SELECT
                ic.comment_id,
                ic.issue_id,
                ic.comment,
                ic.created_at,

                u.user_id,
                u.name  AS commenter_name,
                u.role  AS commenter_role

            FROM issue_comments ic

            JOIN users u
                ON ic.user_id = u.user_id

            WHERE ic.issue_id = $1

            ORDER BY ic.created_at ASC
            `,
            [id]
        );

        res.status(200).json({
            message:  "Comments fetched successfully",
            count:    result.rows.length,
            comments: result.rows
        });

    } catch (error) {

        console.error("Get comments error:", error);

        res.status(500).json({
            message: "Failed to fetch comments",
            error:   error.message
        });
    }

});


// =====================================================
// POST A COMMENT ON AN ISSUE
// POST /api/issues/:id/comments
// =====================================================

router.post("/:id/comments", async (req, res) => {

    const { id } = req.params;

    const { user_id, comment } = req.body;

    // ── VALIDATE ──────────────────────────────────
    if (!user_id || !comment?.trim()) {
        return res.status(400).json({
            message: "user_id and comment are required"
        });
    }

    try {

        // Check issue exists
        const issue = await pool.query(
            `SELECT issue_id FROM issues WHERE issue_id = $1`,
            [id]
        );

        if (issue.rows.length === 0) {
            return res.status(404).json({
                message: "Issue not found"
            });
        }

        // Insert comment
        const result = await pool.query(
            `
            INSERT INTO issue_comments
                (issue_id, user_id, comment)
            VALUES
                ($1, $2, $3)
            RETURNING
                comment_id,
                issue_id,
                comment,
                created_at
            `,
            [id, user_id, comment.trim()]
        );

        // Return comment with commenter name
        const commenterResult = await pool.query(
            `SELECT name, role FROM users WHERE user_id = $1`,
            [user_id]
        );

        const newComment = {
            ...result.rows[0],
            commenter_name: commenterResult.rows[0]?.name || "Unknown",
            commenter_role: commenterResult.rows[0]?.role || "STUDENT"
        };

        res.status(201).json({
            message: "Comment posted successfully",
            comment: newComment
        });

    } catch (error) {

        console.error("Post comment error:", error);

        res.status(500).json({
            message: "Failed to post comment",
            error:   error.message
        });
    }

});


module.exports = router;