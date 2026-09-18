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

        if (
            file.fieldname === "resolution_image" &&
            file.mimetype.startsWith("image/")
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
        {
            name: "image",
            maxCount: 1
        },
        {
            name: "video",
            maxCount: 1
        }
    ]),
    async (req, res) => {

        console.log("POST /api/issues ROUTE HIT");

        try {

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
            } = req.body || {};

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

                            AND
                            (
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

                    let matchRow =
                        openResult.rows.find(
                            (r) =>
                                String(r.issue_id) ===
                                String(
                                    duplicateInfo.matchedIssueId
                                )
                        );

                    if (
                        !matchRow &&
                        duplicateInfo.matchedIssueId
                    ) {

                        const matchedResult =
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
                                    ON i.category_id =
                                       c.category_id

                                WHERE i.issue_id = $1
                                `,
                                [
                                    duplicateInfo.matchedIssueId
                                ]
                            );

                        if (
                            matchedResult.rows.length > 0
                        ) {

                            matchRow =
                                matchedResult.rows[0];

                        }

                    }

                    return res.status(409).json({

                        duplicate: true,

                        message:
                            "A similar complaint already exists.",

                        ai_confidence:
                            duplicateInfo.confidence ||
                            null,

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

            const newIssue =
                result.rows[0];

            console.log(
                "Issue created:",
                newIssue
            );

            // -------------------------------------------------
            // ADD ORIGINAL REPORTER AS FIRST SUPPORTER
            // -------------------------------------------------

            await pool.query(
                `
                INSERT INTO issue_supporters
                (
                    issue_id,
                    user_id
                )

                SELECT
                    $1,
                    $2

                WHERE NOT EXISTS
                (
                    SELECT 1
                    FROM issue_supporters
                    WHERE issue_id = $1
                    AND user_id = $2
                )
                `,
                [
                    newIssue.issue_id,
                    reported_by
                ]
            );

            // -------------------------------------------------
            // STATUS HISTORY
            // -------------------------------------------------

            try {

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
                        NULL,
                        'SUBMITTED',
                        $2
                    )
                    `,
                    [
                        newIssue.issue_id,
                        reported_by
                    ]
                );

            } catch (historyError) {

                console.error(
                    "CREATE STATUS HISTORY ERROR:",
                    historyError.message
                );

            }

            return res.status(201).json({

                duplicate: false,

                message:
                    "Issue created successfully",

                issue:
                    newIssue,

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

            return res.status(500).json({

                message:
                    "Server error",

                error:
                    error.message

            });

        }

    }
);

// =====================================================
// AI REAL-TIME DUPLICATE ANALYSIS
// POST /api/issues/analyze
// =====================================================

router.post(
    "/analyze",
    async (req, res) => {

        try {

            const {
                title,
                description,
                location
            } = req.body || {};

            if (
                !title ||
                !description ||
                !location
            ) {

                return res.status(400).json({
                    message:
                        "title, description and location are required"
                });

            }

            const cleanTitle =
                title.trim();

            const cleanDescription =
                description.trim();

            const cleanLocation =
                location.trim();

            // -------------------------------------------------
            // GET OPEN COMPLAINTS
            // -------------------------------------------------

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
                        ON i.category_id =
                           c.category_id

                    WHERE i.status IN
                    (
                        'SUBMITTED',
                        'VERIFIED',
                        'ASSIGNED',
                        'IN_PROGRESS'
                    )

                    ORDER BY i.created_at DESC

                    LIMIT 500
                    `
                );

            let duplicateResult = {

                isDuplicate: false,

                matchedIssueId: null,

                confidence: "LOW"

            };

            // -------------------------------------------------
            // AI DUPLICATE CHECK
            // -------------------------------------------------

            if (
                ai.isEnabled() &&
                openResult.rows.length > 0
            ) {

                duplicateResult =
                    await ai.detectDuplicate(
                        {
                            title:
                                cleanTitle,

                            description:
                                cleanDescription,

                            location:
                                cleanLocation
                        },
                        openResult.rows
                    );

            }

            // -------------------------------------------------
            // FIND AI MATCH
            // -------------------------------------------------

            let existingIssue = null;

            if (
                duplicateResult?.isDuplicate
            ) {

                existingIssue =
                    openResult.rows.find(
                        (issue) =>
                            String(
                                issue.issue_id
                            ) ===
                            String(
                                duplicateResult
                                    .matchedIssueId
                            )
                    );

                if (
                    !existingIssue &&
                    duplicateResult.matchedIssueId
                ) {

                    const matchedResult =
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
                                ON i.category_id =
                                   c.category_id

                            WHERE i.issue_id = $1
                            `,
                            [
                                duplicateResult
                                    .matchedIssueId
                            ]
                        );

                    if (
                        matchedResult.rows.length > 0
                    ) {

                        existingIssue =
                            matchedResult.rows[0];

                    }

                }

            }

            // -------------------------------------------------
            // SQL FALLBACK
            // -------------------------------------------------

            if (!existingIssue) {

                const fallbackResult =
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
                            ON i.category_id =
                               c.category_id

                        WHERE i.status IN
                        (
                            'SUBMITTED',
                            'VERIFIED',
                            'ASSIGNED',
                            'IN_PROGRESS'
                        )

                        AND LOWER(TRIM(i.location))
                            = LOWER(TRIM($1))

                        AND
                        (
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

                if (
                    fallbackResult.rows.length > 0
                ) {

                    existingIssue =
                        fallbackResult.rows[0];

                    duplicateResult = {

                        isDuplicate: true,

                        matchedIssueId:
                            existingIssue.issue_id,

                        confidence:
                            "HIGH"

                    };

                }

            }

            return res.json({

                ai_enabled:
                    ai.isEnabled(),

                duplicate_check:
                    duplicateResult,

                existing_issue:
                    existingIssue
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

            return res.status(500).json({

                message:
                    "AI duplicate analysis failed",

                error:
                    error.message

            });

        }

    }
);

// =====================================================
// AI STATUS
// GET /api/issues/ai-status
// =====================================================

router.get(
    "/ai-status",
    (req, res) => {

        res.json({
            ai_enabled:
                ai.isEnabled()
        });

    }
);

// =====================================================
// SUPPORT EXISTING COMPLAINT
// POST /api/issues/:issueId/support
// =====================================================

router.post(
    "/:issueId/support",
    async (req, res) => {

        try {

            const {
                issueId
            } = req.params;

            const {
                reported_by
            } = req.body || {};

            if (!reported_by) {

                return res.status(400).json({
                    message:
                        "reported_by is required"
                });

            }

            const issueResult =
                await pool.query(
                    `
                    SELECT
                        issue_id,
                        status
                    FROM issues
                    WHERE issue_id = $1
                    `,
                    [
                        issueId
                    ]
                );

            if (
                issueResult.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Complaint not found"
                });

            }

            if (
                [
                    "RESOLVED",
                    "CLOSED",
                    "REJECTED"
                ].includes(
                    issueResult.rows[0].status
                )
            ) {

                return res.status(400).json({
                    message:
                        "This complaint can no longer be supported"
                });

            }

            const existingSupport =
                await pool.query(
                    `
                    SELECT
                        support_id
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
                        "You have already supported this complaint."
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
                    SELECT
                        COUNT(*) AS report_count

                    FROM issue_supporters

                    WHERE issue_id = $1
                    `,
                    [
                        issueId
                    ]
                );

            return res.status(200).json({

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

            return res.status(500).json({

                message:
                    "Failed to support complaint",

                error:
                    error.message

            });

        }

    }
);

// =====================================================
// GET ALL ISSUES
// GET /api/issues/all
// =====================================================

router.get(
    "/all",
    async (req, res) => {

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
                            AS report_count,

                        COALESCE(
                            JSON_AGG(
                                JSON_BUILD_OBJECT(
                                    'user_id',
                                    s.user_id,

                                    'name',
                                    su.name,

                                    'year',
                                    su.year,

                                    'department',
                                    dsu.department_name,

                                    'supported_at',
                                    s.supported_at
                                )

                                ORDER BY
                                    s.supported_at
                            )
                            FILTER (
                                WHERE
                                    s.user_id
                                    IS NOT NULL
                            ),

                            '[]'::json
                        ) AS supporters

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

                    LEFT JOIN users su
                        ON s.user_id =
                           su.user_id

                    LEFT JOIN departments dsu
                        ON su.department_id =
                           dsu.department_id

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

            return res.status(200).json({

                success: true,

                issues:
                    result.rows

            });

        } catch (error) {

            console.error(
                "Error fetching all issues:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to fetch complaints",

                error:
                    error.message

            });

        }

    }
);

// =====================================================
// GET SINGLE ISSUE
// GET /api/issues/:id
// =====================================================

router.get(
    "/:id",
    async (req, res) => {

        const {
            id
        } = req.params;

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
                    [
                        id
                    ]
                );

            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Issue not found"
                });

            }

            return res.status(200).json({

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

            return res.status(500).json({

                message:
                    "Failed to fetch issue",

                error:
                    error.message

            });

        }

    }
);

// =====================================================
// APPROVER: APPROVE / VERIFY COMPLAINT
// PUT /api/issues/:id/approve
// =====================================================

router.put(
    "/:id/approve",
    async (req, res) => {

        const {
            id
        } = req.params;

        const {
            approver_id,
            verification_note
        } = req.body || {};

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
                    [
                        id
                    ]
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
                    [
                        approver_id
                    ]
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
                Number(
                    approver.admin_type_id
                ) !== 9
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

            // -------------------------------------------------
            // STATUS HISTORY
            // -------------------------------------------------

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

            // -------------------------------------------------
            // NOTIFICATION
            // -------------------------------------------------

            try {

                const reporter =
                    await pool.query(
                        `
                        SELECT
                            reported_by,
                            title

                        FROM issues

                        WHERE issue_id = $1
                        `,
                        [
                            id
                        ]
                    );

                if (
                    reporter.rows.length > 0
                ) {

                    await pool.query(
                        `
                        INSERT INTO notifications
                        (
                            user_id,
                            issue_id,
                            message,
                            is_read
                        )

                        VALUES
                        (
                            $1,
                            $2,
                            $3,
                            false
                        )
                        `,
                        [
                            reporter.rows[0]
                                .reported_by,

                            id,

                            `Your complaint "${reporter.rows[0].title}" has been verified and forwarded to the administration.`
                        ]
                    );

                }

            } catch (notificationError) {

                console.error(
                    "Approve notification error:",
                    notificationError.message
                );

            }

            return res.status(200).json({

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

            return res.status(500).json({

                message:
                    "Failed to approve complaint",

                error:
                    error.message

            });

        }

    }
);

// =====================================================
// APPROVER: REJECT COMPLAINT
// PUT /api/issues/:id/reject
// =====================================================

router.put(
    "/:id/reject",
    async (req, res) => {

        const {
            id
        } = req.params;

        const {
            approver_id,
            rejection_reason
        } = req.body || {};

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
                    [
                        id
                    ]
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
                    [
                        approver_id
                    ]
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
                Number(
                    approver.admin_type_id
                ) !== 9
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

            // -------------------------------------------------
            // STATUS HISTORY
            // -------------------------------------------------

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

            // -------------------------------------------------
            // NOTIFICATION
            // -------------------------------------------------

            try {

                const reporter =
                    await pool.query(
                        `
                        SELECT
                            reported_by,
                            title

                        FROM issues

                        WHERE issue_id = $1
                        `,
                        [
                            id
                        ]
                    );

                if (
                    reporter.rows.length > 0
                ) {

                    await pool.query(
                        `
                        INSERT INTO notifications
                        (
                            user_id,
                            issue_id,
                            message,
                            is_read
                        )

                        VALUES
                        (
                            $1,
                            $2,
                            $3,
                            false
                        )
                        `,
                        [
                            reporter.rows[0]
                                .reported_by,

                            id,

                            `Your complaint "${reporter.rows[0].title}" has been rejected.`
                        ]
                    );

                }

            } catch (notificationError) {

                console.error(
                    "Reject notification error:",
                    notificationError.message
                );

            }

            return res.status(200).json({

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

            return res.status(500).json({

                message:
                    "Failed to reject complaint",

                error:
                    error.message

            });

        }

    }
);

// =====================================================
// ADMIN: UPDATE ISSUE STATUS
// PUT /api/issues/:id/status
// =====================================================
  // =====================================================
// UPDATE ISSUE STATUS - ADMIN
// =====================================================

router.put(
  "/:id/status",
  upload.single("resolution_image"),
  async (req, res) => {
    const { id } = req.params;

    try {
      console.log("=================================");
      console.log("ADMIN STATUS UPDATE");
      console.log("Issue ID:", id);
      console.log("BODY:", req.body);
      console.log("FILE:", req.file);
      console.log("=================================");

      const {
        status,
        resolution_note,
        changed_by,
      } = req.body || {};

      const VALID_STATUSES = [
        "SUBMITTED",
        "VERIFIED",
        "ASSIGNED",
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED",
        "REJECTED",
      ];

      // -------------------------------------------------
      // VALIDATE STATUS
      // -------------------------------------------------

      if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${VALID_STATUSES.join(", ")}`,
        });
      }

      // -------------------------------------------------
      // RESOLVED VALIDATION
      // -------------------------------------------------

      if (
        status === "RESOLVED" &&
        (!resolution_note || !resolution_note.trim())
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A resolution note is required when marking an issue as RESOLVED",
        });
      }

      if (status === "RESOLVED" && !req.file) {
        return res.status(400).json({
          success: false,
          message:
            "Resolution proof image is required when marking an issue as RESOLVED",
        });
      }

      // -------------------------------------------------
      // GET CURRENT ISSUE
      // -------------------------------------------------

      const currentResult = await pool.query(
        `
        SELECT
          issue_id,
          reported_by,
          title,
          status,
          resolution_image_url
        FROM issues
        WHERE issue_id = $1::integer
        `,
        [Number(id)]
      );

      if (currentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Issue not found",
        });
      }

      const currentIssue = currentResult.rows[0];

      const oldStatus = currentIssue.status;

      // -------------------------------------------------
      // RESOLUTION IMAGE
      // -------------------------------------------------

      let resolutionImageUrl =
        currentIssue.resolution_image_url || null;

      if (req.file) {
        resolutionImageUrl =
          `/uploads/${req.file.filename}`;
      }

      // -------------------------------------------------
      // UPDATE ISSUE
      // -------------------------------------------------

      const updatedResult = await pool.query(
        `
        UPDATE issues
        SET
          status = $1::varchar,
          resolution_note = $2::text,
          resolution_image_url = $3::varchar,

          resolved_at =
            CASE
              WHEN $1::varchar = 'RESOLVED'
              THEN NOW()
              ELSE resolved_at
            END,

          updated_at = NOW()

        WHERE issue_id = $4::integer

        RETURNING *
        `,
        [
          status,
          resolution_note
            ? resolution_note.trim()
            : null,
          resolutionImageUrl,
          Number(id),
        ]
      );

      // -------------------------------------------------
      // STATUS HISTORY
      // -------------------------------------------------

      try {
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
            $1::integer,
            $2::varchar,
            $3::varchar,
            $4::integer
          )
          `,
          [
            Number(id),
            oldStatus,
            status,
            changed_by
              ? Number(changed_by)
              : null,
          ]
        );

        console.log(
          "STATUS HISTORY CREATED"
        );
      } catch (historyError) {
        console.error(
          "STATUS HISTORY ERROR:",
          historyError.message
        );
      }

      // -------------------------------------------------
      // NOTIFICATION TO ORIGINAL REPORTER
      // -------------------------------------------------

      try {
        const reporterId =
          currentIssue.reported_by;

        const issueTitle =
          currentIssue.title;

        let notificationMessage = "";

        if (status === "RESOLVED") {
          notificationMessage =
            `Your complaint "${issueTitle}" has been resolved. Resolution proof is now available.`;
        } else if (status === "IN_PROGRESS") {
          notificationMessage =
            `Your complaint "${issueTitle}" is now in progress.`;
        } else if (status === "VERIFIED") {
          notificationMessage =
            `Your complaint "${issueTitle}" has been verified and forwarded to the administration.`;
        } else if (status === "REJECTED") {
          notificationMessage =
            `Your complaint "${issueTitle}" has been rejected.`;
        } else {
          notificationMessage =
            `Your complaint "${issueTitle}" status has been updated to ${status}.`;
        }

        await pool.query(
          `
          INSERT INTO notifications
          (
            user_id,
            issue_id,
            message,
            is_read,
            created_at
          )
          VALUES
          (
            $1::integer,
            $2::integer,
            $3::text,
            false,
            NOW()
          )
          `,
          [
            Number(reporterId),
            Number(id),
            notificationMessage,
          ]
        );

        console.log(
          "NOTIFICATION CREATED FOR USER:",
          reporterId
        );
      } catch (notificationError) {
        console.error(
          "NOTIFICATION ERROR:",
          notificationError.message
        );
      }

      // -------------------------------------------------
      // SUCCESS RESPONSE
      // -------------------------------------------------

      return res.status(200).json({
        success: true,
        message: "Complaint updated successfully",
        issue: updatedResult.rows[0],
      });

    } catch (error) {
      console.error(
        "ADMIN STATUS UPDATE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to update complaint",
        error: error.message,
      });
    }
  }
);

// =====================================================
// POST COMMENT ON AN ISSUE
// POST /api/issues/:id/comments
// =====================================================

router.post(
    "/:id/comments",
    async (req, res) => {

        const {
            id
        } = req.params;

        const {
            user_id,
            comment
        } = req.body || {};

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
                    [
                        id
                    ]
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
                    [
                        user_id
                    ]
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

            return res.status(201).json({

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

            return res.status(500).json({

                message:
                    "Failed to post comment",

                error:
                    error.message

            });

        }

    }
);

// =====================================================
// GET NOTIFICATIONS FOR A USER
// GET /api/issues/notifications/:userId
// =====================================================

router.get(
    "/notifications/:userId",
    async (req, res) => {

        try {

            const {
                userId
            } = req.params;

            const result =
                await pool.query(
                    `
                    SELECT

                        n.notification_id,
                        n.issue_id,
                        n.message,
                        n.is_read,
                        n.created_at,

                        i.title AS issue_title,
                        i.status AS issue_status,

                        i.description AS issue_description,
                        i.location AS issue_location,

                        i.image_url AS issue_image_url,

                        i.resolution_note,
                        i.resolution_image_url,
                        i.resolved_at

                    FROM notifications n

                    LEFT JOIN issues i
                        ON n.issue_id =
                           i.issue_id

                    WHERE n.user_id = $1

                    ORDER BY
                        n.created_at DESC
                    `,
                    [
                        userId
                    ]
                );

            return res.status(200).json(
                result.rows
            );

        } catch (error) {

            console.error(
                "Get notifications error:",
                error
            );

            return res.status(500).json({

                message:
                    "Failed to fetch notifications",

                error:
                    error.message

            });

        }

    }
);

// =====================================================
// SUBMIT FEEDBACK FOR RESOLVED ISSUE
// POST /api/issues/:id/feedback
// =====================================================

router.post(
    "/:id/feedback",
    async (req, res) => {

        const {
            id
        } = req.params;

        const {
            user_id,
            rating,
            comment
        } = req.body || {};

        if (!user_id) {

            return res.status(400).json({
                message:
                    "user_id is required"
            });

        }

        const numericRating =
            Number(rating);

        if (
            !Number.isInteger(
                numericRating
            ) ||
            numericRating < 1 ||
            numericRating > 5
        ) {

            return res.status(400).json({
                message:
                    "Rating must be between 1 and 5"
            });

        }

        try {

            const issueResult =
                await pool.query(
                    `
                    SELECT
                        issue_id,
                        reported_by,
                        title,
                        status

                    FROM issues

                    WHERE issue_id = $1
                    `,
                    [
                        id
                    ]
                );

            if (
                issueResult.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Complaint not found"
                });

            }

            const issue =
                issueResult.rows[0];

            if (
                issue.status !== "RESOLVED"
            ) {

                return res.status(400).json({

                    message:
                        "Feedback can only be submitted for a resolved complaint"

                });

            }

            if (
                Number(issue.reported_by) !==
                Number(user_id)
            ) {

                return res.status(403).json({

                    message:
                        "Only the person who reported this complaint can submit feedback"

                });

            }

            const existingFeedback =
                await pool.query(
                    `
                    SELECT
                        feedback_id

                    FROM feedback

                    WHERE issue_id = $1

                    AND user_id = $2
                    `,
                    [
                        id,
                        user_id
                    ]
                );

            if (
                existingFeedback.rows.length > 0
            ) {

                return res.status(409).json({

                    message:
                        "You have already submitted feedback for this complaint"

                });

            }

            const result =
                await pool.query(
                    `
                    INSERT INTO feedback
                    (
                        issue_id,
                        user_id,
                        rating,
                        comment
                    )

                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4
                    )

                    RETURNING
                        feedback_id,
                        issue_id,
                        user_id,
                        rating,
                        comment,
                        created_at
                    `,
                    [
                        id,
                        user_id,
                        numericRating,

                        comment
                            ? comment.trim()
                            : null
                    ]
                );

            return res.status(201).json({

                message:
                    "Feedback submitted successfully",

                feedback:
                    result.rows[0]

            });

        } catch (error) {

            console.error(
                "Submit feedback error:",
                error
            );

            return res.status(500).json({

                message:
                    "Failed to submit feedback",

                error:
                    error.message

            });

        }

    }
);

// =====================================================
// CHECK USER FEEDBACK
// GET /api/issues/:id/feedback/:userId
// =====================================================

router.get(
    "/:id/feedback/:userId",
    async (req, res) => {

        const {
            id,
            userId
        } = req.params;

        try {

            const result =
                await pool.query(
                    `
                    SELECT
                        feedback_id,
                        issue_id,
                        user_id,
                        rating,
                        comment,
                        created_at

                    FROM feedback

                    WHERE issue_id = $1

                    AND user_id = $2
                    `,
                    [
                        id,
                        userId
                    ]
                );

            return res.status(200).json({

                submitted:
                    result.rows.length > 0,

                feedback:
                    result.rows[0] || null

            });

        } catch (error) {

            console.error(
                "Check feedback error:",
                error
            );

            return res.status(500).json({

                message:
                    "Failed to check feedback",

                error:
                    error.message

            });

        }

    }
);

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;