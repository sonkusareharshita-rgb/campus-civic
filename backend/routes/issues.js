const express = require("express");
const pool = require("../db");
const ai = require("../ai/gemini");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

console.log("ISSUES ROUTER FILE LOADED");

// =====================================================
// FILE UPLOAD CONFIGURATION
// =====================================================

const uploadsDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },

    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname);

        const filename =
            `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

        cb(null, filename);
    }
});

const upload = multer({
    storage,

    limits: {
        fileSize: 100 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {

        if (
            file.fieldname === "image" &&
            file.mimetype.startsWith("image/")
        ) {
            return cb(null, true);
        }

        if (
            file.fieldname === "video" &&
            file.mimetype.startsWith("video/")
        ) {
            return cb(null, true);
        }

        cb(new Error("Invalid file type"));
    }
});

// =====================================================
// TEST ROUTE
// GET /api/issues/test
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

router.post(
    "/",

    upload.fields([
        { name: "image", maxCount: 1 },
        { name: "video", maxCount: 1 }
    ]),

    async (req, res) => {

        console.log("POST /api/issues ROUTE HIT");

        try {

            // -------------------------------------------------
            // FORM DATA
            // -------------------------------------------------

            const {
                reported_by,
                category_id,
                department_id,
                title,
                description,
                location,
                priority,
                force_create,
                visibility
            } = req.body;

            // -------------------------------------------------
            // UPLOADED FILES
            // -------------------------------------------------

            const imageFile =
                req.files?.image?.[0];

            const videoFile =
                req.files?.video?.[0];

            const image_url =
                imageFile
                    ? `/uploads/${imageFile.filename}`
                    : null;

            const video_url =
                videoFile
                    ? `/uploads/${videoFile.filename}`
                    : null;

            console.log("Uploaded image:", image_url);
            console.log("Uploaded video:", video_url);

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
            // DUPLICATE COMPLAINT CHECK
            // -------------------------------------------------

            if (force_create !== "true") {

                const openResult =
                    await pool.query(
                        `
                        SELECT
                            i.issue_id,
                            i.title,
                            i.description,
                            i.location,
                            i.status,
                            i.priority,
                            i.created_at,
                            c.category_name

                        FROM issues i

                        JOIN categories c
                            ON i.category_id = c.category_id

                        WHERE i.status IN
                            (
                                'SUBMITTED',
                                'VERIFIED',
                                'ASSIGNED',
                                'IN_PROGRESS'
                            )

                        ORDER BY i.created_at DESC

                        LIMIT 50
                        `
                    );

                let duplicateInfo = null;

                // -------------------------------------------------
                // AI DUPLICATE DETECTION
                // -------------------------------------------------

                if (
                    ai.isEnabled() &&
                    openResult.rows.length > 0
                ) {

                    duplicateInfo =
                        await ai.detectDuplicate(
                            {
                                title,
                                description,
                                location
                            },
                            openResult.rows
                        );
                }

                // -------------------------------------------------
                // SQL FALLBACK DUPLICATE CHECK
                // -------------------------------------------------

                if (
                    !duplicateInfo ||
                    !duplicateInfo.isDuplicate ||
                    duplicateInfo.aiError
                ) {

                    const sqlDup =
                        await pool.query(
                            `
                            SELECT
                                i.issue_id,
                                i.title,
                                i.description,
                                i.location,
                                i.status,
                                i.priority,
                                i.created_at,
                                c.category_name

                            FROM issues i

                            JOIN categories c
                                ON i.category_id = c.category_id

                            WHERE i.category_id = $1

                              AND LOWER(TRIM(i.location))
                                  = LOWER(TRIM($2))

                              AND i.status IN
                                  (
                                      'SUBMITTED',
                                      'VERIFIED',
                                      'ASSIGNED',
                                      'IN_PROGRESS'
                                  )

                              AND (
                                    LOWER(i.title)
                                        LIKE '%' || LOWER($3) || '%'

                                    OR

                                    LOWER($3)
                                        LIKE '%' || LOWER(i.title) || '%'
                              )

                            ORDER BY i.created_at DESC

                            LIMIT 1
                            `,
                            [
                                category_id,
                                location,
                                title
                            ]
                        );

                    if (sqlDup.rows.length > 0) {

                        duplicateInfo = {
                            isDuplicate: true,

                            matchedIssueId:
                                sqlDup.rows[0].issue_id,

                            confidence: "HIGH"
                        };
                    }
                }

                // -------------------------------------------------
                // RETURN DUPLICATE
                // -------------------------------------------------

                if (
                    duplicateInfo &&
                    duplicateInfo.isDuplicate
                ) {

                    let matchRow = openResult.rows.find(
    (r) =>
        String(r.issue_id) ===
        String(duplicateInfo.matchedIssueId)
);

// Agar matched issue first 50 me nahi mila,
// to directly database se fetch karo
if (!matchRow && duplicateInfo.matchedIssueId) {

    const matchedResult = await pool.query(
        `
        SELECT
            i.issue_id,
            i.title,
            i.description,
            i.location,
            i.status,
            i.priority,
            i.created_at,
            c.category_name

        FROM issues i

        JOIN categories c
            ON i.category_id = c.category_id

        WHERE i.issue_id = $1
        `,
        [duplicateInfo.matchedIssueId]
    );

    if (matchedResult.rows.length > 0) {
        matchRow = matchedResult.rows[0];
    }
}
                    return res.status(409).json({

                        duplicate: true,

                        message:
                            "A similar complaint already exists.",

                        ai_confidence:
                            duplicateInfo.confidence || null,

                        existing_issue:
                            matchRow || {
                                issue_id:
                                    duplicateInfo.matchedIssueId
                            }
                    });
                }
            }

            // -------------------------------------------------
            // AI AUTO PRIORITY
            // -------------------------------------------------

            let finalPriority =
                priority || "MEDIUM";

            if (
                !priority &&
                ai.isEnabled()
            ) {

                finalPriority =
                    await ai.scorePriority(
                        title,
                        description,
                        null
                    );

                console.log(
                    "[AI] Auto-priority:",
                    finalPriority
                );
            }

            // -------------------------------------------------
            // AI CATEGORY SUGGESTION
            // -------------------------------------------------

            let aiCategory = null;

            if (ai.isEnabled()) {

                aiCategory =
                    await ai.detectCategory(
                        title,
                        description
                    );

                console.log(
                    "[AI] Suggested category:",
                    aiCategory
                );
            }

            // -------------------------------------------------
            // CREATE ISSUE
            // -------------------------------------------------

            const result =
                await pool.query(
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
                        video_url,
                        priority,
                        visibility
                    )

                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7,
                        $8,
                        $9,
                        $10
                    )

                    RETURNING *
                    `,
                    [
                        reported_by,
                        category_id,
                        department_id || null,
                        title,
                        description,
                        location,
                        image_url,
                        video_url,
                        finalPriority,
                        visibility || "PUBLIC"
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

                    priority_auto:
                        !priority
                            ? finalPriority
                            : null,

                    suggested_category:
                        aiCategory,

                    ai_enabled:
                        ai.isEnabled()
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
    }
);

// =====================================================
// AI REAL-TIME ANALYSIS
// POST /api/issues/analyze
// =====================================================
   // =====================================================
// AI REAL-TIME DUPLICATE ANALYSIS
// POST /api/issues/analyze
// =====================================================

router.post("/analyze", async (req, res) => {
    try {
        const {
            title,
            description,
            location
        } = req.body;

        if (!title || !description || !location) {
            return res.status(400).json({
                message: "title, description and location are required"
            });
        }

        const cleanTitle = title.trim();
        const cleanDescription = description.trim();
        const cleanLocation = location.trim();

        // -------------------------------------------------
        // GET OPEN COMPLAINTS
        // -------------------------------------------------

        const openResult = await pool.query(`
            SELECT
                i.issue_id,
                i.title,
                i.description,
                i.location,
                i.status,
                i.priority,
                i.created_at,
                c.category_name
            FROM issues i
            JOIN categories c
                ON i.category_id = c.category_id
            WHERE i.status IN (
                'SUBMITTED',
                'VERIFIED',
                'ASSIGNED',
                'IN_PROGRESS'
            )
            ORDER BY i.created_at DESC
            LIMIT 500
        `);

        console.log("========== DUPLICATE CHECK ==========");
        console.log("TITLE:", cleanTitle);
        console.log("LOCATION:", cleanLocation);
        console.log("OPEN ISSUES:", openResult.rows.length);

        // -------------------------------------------------
        // AI DUPLICATE CHECK
        // -------------------------------------------------

        let duplicateResult = {
            isDuplicate: false,
            matchedIssueId: null,
            confidence: "LOW"
        };

        if (
            ai.isEnabled() &&
            openResult.rows.length > 0
        ) {
            duplicateResult = await ai.detectDuplicate(
                {
                    title: cleanTitle,
                    description: cleanDescription,
                    location: cleanLocation
                },
                openResult.rows
            );

            console.log(
                "AI DUPLICATE RESULT:",
                duplicateResult
            );
        }

        // -------------------------------------------------
        // FIND AI MATCH
        // -------------------------------------------------

        let existingIssue = null;

        if (duplicateResult?.isDuplicate) {
            existingIssue = openResult.rows.find(
                (issue) =>
                    String(issue.issue_id) ===
                    String(duplicateResult.matchedIssueId)
            );

            // If AI matched issue is not in result,
            // fetch it directly from database
            if (
                !existingIssue &&
                duplicateResult.matchedIssueId
            ) {
                const matchedResult = await pool.query(
                    `
                    SELECT
                        i.issue_id,
                        i.title,
                        i.description,
                        i.location,
                        i.status,
                        i.priority,
                        i.created_at,
                        c.category_name
                    FROM issues i
                    JOIN categories c
                        ON i.category_id = c.category_id
                    WHERE i.issue_id = $1
                    `,
                    [duplicateResult.matchedIssueId]
                );

                if (matchedResult.rows.length > 0) {
                    existingIssue =
                        matchedResult.rows[0];
                }
            }
        }

        // -------------------------------------------------
        // SQL FALLBACK DUPLICATE CHECK
        // -------------------------------------------------
        // AI miss kare tab bhi same location + similar
        // title ko duplicate maana jayega.
        // -------------------------------------------------

        if (!existingIssue) {
            const fallbackResult = await pool.query(
                `
                SELECT
                    i.issue_id,
                    i.title,
                    i.description,
                    i.location,
                    i.status,
                    i.priority,
                    i.created_at,
                    c.category_name
                FROM issues i
                JOIN categories c
                    ON i.category_id = c.category_id
                WHERE i.status IN (
                    'SUBMITTED',
                    'VERIFIED',
                    'ASSIGNED',
                    'IN_PROGRESS'
                )
                AND LOWER(TRIM(i.location))
                    = LOWER(TRIM($1))
                AND (
                    LOWER(i.title)
                        = LOWER($2)
                    OR LOWER(i.title)
                        LIKE '%' || LOWER($2) || '%'
                    OR LOWER($2)
                        LIKE '%' || LOWER(i.title) || '%'
                )
                ORDER BY i.created_at DESC
                LIMIT 1
                `,
                [
                    cleanLocation,
                    cleanTitle
                ]
            );

            if (fallbackResult.rows.length > 0) {
                existingIssue =
                    fallbackResult.rows[0];

                duplicateResult = {
                    isDuplicate: true,
                    matchedIssueId:
                        existingIssue.issue_id,
                    confidence: "HIGH"
                };

                console.log(
                    "SQL FALLBACK MATCH:",
                    existingIssue.issue_id
                );
            }
        }

        console.log(
            "FINAL EXISTING ISSUE:",
            existingIssue?.issue_id || "NONE"
        );

        console.log("====================================");

        // -------------------------------------------------
        // RESPONSE
        // -------------------------------------------------

        res.json({
            ai_enabled: ai.isEnabled(),

            duplicate_check: duplicateResult,

            existing_issue: existingIssue
                ? {
                    issue_id:
                        existingIssue.issue_id,

                    title:
                        existingIssue.title,

                    description:
                        existingIssue.description,

                    location:
                        existingIssue.location,

                    status:
                        existingIssue.status,

                    priority:
                        existingIssue.priority,

                    category_name:
                        existingIssue.category_name,

                    created_at:
                        existingIssue.created_at
                }
                : null
        });

    } catch (error) {
        console.error(
            "[AI] Duplicate analysis error:",
            error
        );

        res.status(500).json({
            message:
                "AI duplicate analysis failed",

            error:
                error.message
        });
    }
});
// =====================================================
// AI STATUS
// GET /api/issues/ai-status
// =====================================================

router.get("/ai-status", (req, res) => {

    res.json({
        ai_enabled:
            ai.isEnabled()
    });
});

// =====================================================
// SUPPORT EXISTING COMPLAINT
// POST /api/issues/:issueId/support
// =====================================================

router.post("/:issueId/support", async (req, res) => {

    try {

        const { issueId } =
            req.params;

        const { reported_by } =
            req.body;

        if (!reported_by) {

            return res.status(400).json({
                message:
                    "reported_by is required"
            });
        }

        const issueResult =
            await pool.query(
                `
                SELECT *
                FROM issues
                WHERE issue_id = $1
                `,
                [issueId]
            );

        if (
            issueResult.rows.length === 0
        ) {

            return res.status(404).json({
                message:
                    "Complaint not found"
            });
        }

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

        if (
            existingSupport.rows.length > 0
        ) {

            return res.status(409).json({
                message:
                    "You have already reported this issue."
            });
        }

        await pool.query(
            `
            INSERT INTO issue_supporters
            (
                issue_id,
                user_id
            )

            VALUES
            (
                $1,
                $2
            )
            `,
            [
                issueId,
                reported_by
            ]
        );

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
                    countResult.rows[0]
                        .report_count
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
        "GET /api/issues/all ROUTE HIT"
    );

    try {

        const result =
            await pool.query(
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
                    i.video_url,

                    i.priority,
                    i.status,

                    i.created_at,
                    i.updated_at,

                    i.assigned_to,

                    i.approver_id,
                    i.approved_by,
                    i.approved_at,
                    i.rejection_reason,

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
                    ON i.reported_by =
                       u.user_id

                JOIN categories c
                    ON i.category_id =
                       c.category_id

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

    const { id } =
        req.params;

    try {

        const result =
            await pool.query(
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
                    i.video_url,

                    i.priority,
                    i.status,

                    i.created_at,
                    i.updated_at,

                    i.assigned_to,

                    i.approver_id,
                    i.approved_by,
                    i.approved_at,
                    i.rejection_reason,

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
                    ON i.reported_by =
                       u.user_id

                JOIN categories c
                    ON i.category_id =
                       c.category_id

                LEFT JOIN departments d
                    ON i.department_id =
                       d.department_id

                LEFT JOIN issue_supporters s
                    ON i.issue_id =
                       s.issue_id

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

        if (
            result.rows.length === 0
        ) {

            return res.status(404).json({
                message:
                    "Issue not found"
            });
        }

        res.status(200).json({

            message:
                "Issue fetched successfully",

            issue:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Get single issue error:",
            error
        );

        res.status(500).json({

            message:
                "Failed to fetch issue",

            error:
                error.message
        });
    }
});

// =====================================================
// APPROVER: APPROVE / VERIFY COMPLAINT
// PUT /api/issues/:id/approve
// =====================================================

router.put("/:id/approve", async (req, res) => {

    const { id } =
        req.params;

    const {
        approver_id,
        verification_note
    } = req.body;

    if (!approver_id) {

        return res.status(400).json({
            message:
                "approver_id is required"
        });
    }

    if (
        !verification_note ||
        !verification_note.trim()
    ) {

        return res.status(400).json({
            message:
                "Verification note is required"
        });
    }

    try {

        const issueResult =
            await pool.query(
                `
                SELECT
                    issue_id,
                    status
                FROM issues
                WHERE issue_id = $1
                `,
                [id]
            );

        if (
            issueResult.rows.length === 0
        ) {

            return res.status(404).json({
                message:
                    "Complaint not found"
            });
        }

        const oldStatus =
            issueResult.rows[0].status;

        if (
            oldStatus !== "SUBMITTED"
        ) {

            return res.status(400).json({
                message:
                    `Complaint cannot be approved because current status is ${oldStatus}`
            });
        }

        const approverResult =
            await pool.query(
                `
                SELECT
                    user_id,
                    name,
                    role,
                    admin_type_id
                FROM users
                WHERE user_id = $1
                `,
                [approver_id]
            );

        if (
            approverResult.rows.length === 0
        ) {

            return res.status(404).json({
                message:
                    "Approver not found"
            });
        }

        const approver =
            approverResult.rows[0];

        if (
            approver.role !== "ADMIN" ||
            Number(approver.admin_type_id) !== 9
        ) {

            return res.status(403).json({
                message:
                    "Only an Approver can verify complaints"
            });
        }

        const updated =
            await pool.query(
                `
                UPDATE issues

                SET
                    status = 'VERIFIED',

                    approver_id = $1,

                    approved_by = $1,

                    approved_at = NOW(),

                    rejection_reason = NULL,

                    updated_at = NOW()

                WHERE issue_id = $2

                RETURNING *
                `,
                [
                    approver_id,
                    id
                ]
            );

        await pool.query(
            `
            INSERT INTO issue_status_history
            (
                issue_id,
                old_status,
                new_status,
                changed_by
            )

            VALUES
            (
                $1,
                $2,
                'VERIFIED',
                $3
            )
            `,
            [
                id,
                oldStatus,
                approver_id
            ]
        );

        res.status(200).json({

            message:
                "Complaint verified and forwarded to admin successfully",

            issue:
                updated.rows[0]
        });

    } catch (error) {

        console.error(
            "Approver approve error:",
            error
        );

        res.status(500).json({

            message:
                "Failed to approve complaint",

            error:
                error.message
        });
    }
});

// =====================================================
// APPROVER: REJECT COMPLAINT
// PUT /api/issues/:id/reject
// =====================================================

router.put("/:id/reject", async (req, res) => {

    const { id } =
        req.params;

    const {
        approver_id,
        rejection_reason
    } = req.body;

    if (!approver_id) {

        return res.status(400).json({
            message:
                "approver_id is required"
        });
    }

    if (
        !rejection_reason ||
        !rejection_reason.trim()
    ) {

        return res.status(400).json({
            message:
                "Rejection reason is required"
        });
    }

    try {

        const issueResult =
            await pool.query(
                `
                SELECT
                    issue_id,
                    status
                FROM issues
                WHERE issue_id = $1
                `,
                [id]
            );

        if (
            issueResult.rows.length === 0
        ) {

            return res.status(404).json({
                message:
                    "Complaint not found"
            });
        }

        const oldStatus =
            issueResult.rows[0].status;

        if (
            oldStatus !== "SUBMITTED"
        ) {

            return res.status(400).json({
                message:
                    `Complaint cannot be rejected because current status is ${oldStatus}`
            });
        }

        const approverResult =
            await pool.query(
                `
                SELECT
                    user_id,
                    name,
                    role,
                    admin_type_id
                FROM users
                WHERE user_id = $1
                `,
                [approver_id]
            );

        if (
            approverResult.rows.length === 0
        ) {

            return res.status(404).json({
                message:
                    "Approver not found"
            });
        }

        const approver =
            approverResult.rows[0];

        if (
            approver.role !== "ADMIN" ||
            Number(approver.admin_type_id) !== 9
        ) {

            return res.status(403).json({
                message:
                    "Only an Approver can reject complaints"
            });
        }

        const updated =
            await pool.query(
                `
                UPDATE issues

                SET
                    status = 'REJECTED',

                    approver_id = $1,

                    approved_by = NULL,

                    approved_at = NULL,

                    rejection_reason = $2,

                    updated_at = NOW()

                WHERE issue_id = $3

                RETURNING *
                `,
                [
                    approver_id,
                    rejection_reason.trim(),
                    id
                ]
            );

        await pool.query(
            `
            INSERT INTO issue_status_history
            (
                issue_id,
                old_status,
                new_status,
                changed_by
            )

            VALUES
            (
                $1,
                $2,
                'REJECTED',
                $3
            )
            `,
            [
                id,
                oldStatus,
                approver_id
            ]
        );

        res.status(200).json({

            message:
                "Complaint rejected successfully",

            issue:
                updated.rows[0]
        });

    } catch (error) {

        console.error(
            "Approver reject error:",
            error
        );

        res.status(500).json({

            message:
                "Failed to reject complaint",

            error:
                error.message
        });
    }
});

// =====================================================
// UPDATE ISSUE STATUS - ADMIN
// PUT /api/issues/:id/status
// =====================================================

router.put("/:id/status", async (req, res) => {

    const { id } =
        req.params;

    const {
        status,
        resolution_note,
        resolution_image_url,
        changed_by
    } = req.body;

    const VALID_STATUSES = [
        "SUBMITTED",
        "VERIFIED",
        "ASSIGNED",
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED",
        "REJECTED"
    ];

    if (
        !status ||
        !VALID_STATUSES.includes(status)
    ) {

        return res.status(400).json({
            message:
                `Status must be one of: ${VALID_STATUSES.join(", ")}`
        });
    }

    if (
        status === "RESOLVED" &&
        (
            !resolution_note ||
            !resolution_note.trim()
        )
    ) {

        return res.status(400).json({
            message:
                "A resolution note is required when marking an issue as RESOLVED"
        });
    }

    try {

        const current =
            await pool.query(
                `
                SELECT
                    status
                FROM issues
                WHERE issue_id = $1
                `,
                [id]
            );

        if (
            current.rows.length === 0
        ) {

            return res.status(404).json({
                message:
                    "Issue not found"
            });
        }

        const oldStatus =
            current.rows[0].status;

        const updated =
            await pool.query(
                `
                UPDATE issues

                SET
                    status = $1,

                    resolution_note = $2,

                    resolution_image_url = $3,

                    resolved_at =
                        CASE
                            WHEN $1::varchar = 'RESOLVED'
                            THEN NOW()
                            ELSE resolved_at
                        END,

                    updated_at = NOW()

                WHERE issue_id = $4

                RETURNING *
                `,
                [
                    status,

                    resolution_note
                        ? resolution_note.trim()
                        : null,

                    resolution_image_url
                        || null,

                    id
                ]
            );

        // =====================================================
        // CREATE NOTIFICATION FOR COMPLAINT REPORTER
        // =====================================================

        const reporterResult =
            await pool.query(
                `
                SELECT reported_by
                FROM issues
                WHERE issue_id = $1
                `,
                [id]
            );

        if (
            reporterResult.rows.length > 0
        ) {

            const reporterId =
                reporterResult.rows[0].reported_by;

            await pool.query(
                `
                INSERT INTO notifications
                (
                    user_id,
                    issue_id,
                    message
                )

                VALUES
                (
                    $1,
                    $2,
                    $3
                )
                `,
                [
                    reporterId,
                    id,
                    `Your complaint status has been updated to ${status}.`
                ]
            );
        }

        // =====================================================
        // STATUS HISTORY
        // =====================================================

        if (changed_by) {

            await pool.query(
                `
                INSERT INTO issue_status_history
                (
                    issue_id,
                    old_status,
                    new_status,
                    changed_by
                )

                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4
                )
                `,
                [
                    id,
                    oldStatus,
                    status,
                    changed_by
                ]
            );
        }

        res.status(200).json({

            message:
                `Issue status updated to ${status}`,

            issue:
                updated.rows[0]
        });

    } catch (error) {

        console.error(
            "Update issue status error:",
            error
        );

        res.status(500).json({

            message:
                "Failed to update issue status",

            error:
                error.message
        });
    }
});

// =====================================================
// GET COMMENTS FOR AN ISSUE
// GET /api/issues/:id/comments
// =====================================================

router.get("/:id/comments", async (req, res) => {

    const { id } =
        req.params;

    try {

        const result =
            await pool.query(
                `
                SELECT

                    ic.comment_id,
                    ic.issue_id,
                    ic.comment,
                    ic.created_at,

                    u.user_id,

                    u.name AS commenter_name,

                    u.role AS commenter_role

                FROM issue_comments ic

                JOIN users u
                    ON ic.user_id =
                       u.user_id

                WHERE ic.issue_id = $1

                ORDER BY
                    ic.created_at ASC
                `,
                [id]
            );

        res.status(200).json({

            message:
                "Comments fetched successfully",

            count:
                result.rows.length,

            comments:
                result.rows
        });

    } catch (error) {

        console.error(
            "Get comments error:",
            error
        );

        res.status(500).json({

            message:
                "Failed to fetch comments",

            error:
                error.message
        });
    }
});

// =====================================================
// POST COMMENT ON AN ISSUE
// POST /api/issues/:id/comments
// =====================================================

router.post("/:id/comments", async (req, res) => {

    const { id } =
        req.params;

    const {
        user_id,
        comment
    } = req.body;

    if (
        !user_id ||
        !comment ||
        !comment.trim()
    ) {

        return res.status(400).json({
            message:
                "user_id and comment are required"
        });
    }

    try {

        const issue =
            await pool.query(
                `
                SELECT
                    issue_id
                FROM issues
                WHERE issue_id = $1
                `,
                [id]
            );

        if (
            issue.rows.length === 0
        ) {

            return res.status(404).json({
                message:
                    "Issue not found"
            });
        }

        const result =
            await pool.query(
                `
                INSERT INTO issue_comments
                (
                    issue_id,
                    user_id,
                    comment
                )

                VALUES
                (
                    $1,
                    $2,
                    $3
                )

                RETURNING
                    comment_id,
                    issue_id,
                    comment,
                    created_at
                `,
                [
                    id,
                    user_id,
                    comment.trim()
                ]
            );

        const commenterResult =
            await pool.query(
                `
                SELECT
                    name,
                    role
                FROM users
                WHERE user_id = $1
                `,
                [user_id]
            );

        const newComment = {

            ...result.rows[0],

            commenter_name:
                commenterResult.rows[0]
                    ?.name ||
                "Unknown",

            commenter_role:
                commenterResult.rows[0]
                    ?.role ||
                "STUDENT"
        };

        res.status(201).json({

            message:
                "Comment posted successfully",

            comment:
                newComment
        });

    } catch (error) {

        console.error(
            "Post comment error:",
            error
        );

        res.status(500).json({

            message:
                "Failed to post comment",

            error:
                error.message
        });
    }
});

// =====================================================
// GET NOTIFICATIONS FOR A USER
// GET /api/issues/notifications/:userId
// =====================================================

router.get("/notifications/:userId", async (req, res) => {

    try {

        const { userId } =
            req.params;

        const result =
            await pool.query(
                `
                SELECT

                    notification_id,
                    issue_id,
                    message,
                    is_read,
                    created_at

                FROM notifications

                WHERE user_id = $1

                ORDER BY
                    created_at DESC
                `,
                [userId]
            );

        res.json(
            result.rows
        );

    } catch (error) {

        console.error(
            "Get notifications error:",
            error
        );

        res.status(500).json({

            message:
                "Failed to fetch notifications"
        });
    }
});

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;