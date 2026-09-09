const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../db");

const router = express.Router();

console.log("ISSUES ROUTER FILE LOADED");


// =====================================================
// UPLOADS FOLDER
// =====================================================

const uploadDirectory = path.join(
    __dirname,
    "../uploads"
);

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, {
        recursive: true
    });
}


// =====================================================
// MULTER STORAGE
// =====================================================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },

    filename: (req, file, cb) => {

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1e9);

        cb(
            null,
            uniqueName +
            path.extname(file.originalname)
        );
    }

});


// =====================================================
// FILE FILTER
// =====================================================

const fileFilter = (req, file, cb) => {

    // PHOTO
    if (file.fieldname === "image") {

        if (
            file.mimetype.startsWith("image/")
        ) {
            return cb(null, true);
        }

        return cb(
            new Error("Only image files are allowed")
        );
    }


    // VIDEO
    if (file.fieldname === "video") {

        if (
            file.mimetype.startsWith("video/")
        ) {
            return cb(null, true);
        }

        return cb(
            new Error("Only video files are allowed")
        );
    }

};


const upload = multer({

    storage,

    fileFilter,

    limits: {

        fileSize: 50 * 1024 * 1024

    }

});


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

        console.log(
            "POST /api/issues ROUTE HIT"
        );

        try {

            const {
                reported_by,
                category_id,
                department_id,
                title,
                description,
                location,
                priority,
                visibility,
                force_create
            } = req.body;


            // =============================================
            // VALIDATION
            // =============================================

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


            // =============================================
            // VISIBILITY
            // =============================================

            const issueVisibility =
                visibility === "PRIVATE"
                    ? "PRIVATE"
                    : "PUBLIC";


            // =============================================
            // FILE PATHS
            // =============================================

            let image_url = null;
            let video_url = null;


            if (
                req.files &&
                req.files.image &&
                req.files.image[0]
            ) {

                image_url =
                    `/uploads/${req.files.image[0].filename}`;

            }


            if (
                req.files &&
                req.files.video &&
                req.files.video[0]
            ) {

                video_url =
                    `/uploads/${req.files.video[0].filename}`;

            }


            // =============================================
            // DUPLICATE CHECK
            // =============================================

            if (
                force_create !== "true" &&
                force_create !== true
            ) {

                const duplicateResult =
                    await pool.query(

                        `
                        SELECT
                            i.issue_id,
                            i.title,
                            i.location,
                            i.status

                        FROM issues i

                        WHERE
                            i.category_id = $1

                            AND LOWER(TRIM(i.location))
                            = LOWER(TRIM($2))

                            AND LOWER(i.title)
                            LIKE '%' || LOWER($3) || '%'

                        ORDER BY i.created_at DESC

                        LIMIT 1
                        `,

                        [
                            category_id,
                            location,
                            title
                        ]

                    );


                if (
                    duplicateResult.rows.length > 0
                ) {

                    return res.status(409).json({

                        duplicate: true,

                        message:
                            "A similar complaint already exists.",

                        existing_issue:
                            duplicateResult.rows[0]

                    });

                }

            }


            // =============================================
            // CREATE ISSUE
            // =============================================

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
                        visibility,
                        status
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
                        $10,
                        'SUBMITTED'
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
                        priority || "MEDIUM",
                        issueVisibility
                    ]

                );


            console.log(
                "Issue created:",
                result.rows[0]
            );


            res.status(201).json({

                message:
                    "Issue created successfully",

                issue:
                    result.rows[0]

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
// GET ALL ISSUES
// =====================================================

router.get("/all", async (req, res) => {

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
                    i.visibility,
                    i.status,

                    i.created_at,
                    i.updated_at,

                    i.approver_id,
                    i.approved_by,
                    i.approved_at,

                    i.rejection_reason,

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
// GET PUBLIC ISSUES
// =====================================================

router.get("/public", async (req, res) => {

    try {

        const result =
            await pool.query(

                `
                SELECT

                    i.*,

                    u.name AS reported_by_name,

                    c.category_name,

                    d.department_name

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


                WHERE
                    i.visibility = 'PUBLIC'


                ORDER BY
                    i.created_at DESC
                `
            );


        res.status(200).json({

            issues:
                result.rows

        });


    } catch (error) {

        res.status(500).json({

            message:
                "Failed to fetch public issues",

            error:
                error.message

        });

    }

});


// =====================================================
// GET COMPLAINTS FOR APPROVER
// =====================================================

router.get(
    "/approver/:approverId",

    async (req, res) => {

        try {

            const {
                approverId
            } = req.params;


            const result =
                await pool.query(

                    `
                    SELECT

                        i.issue_id,
                        i.title,
                        i.description,
                        i.location,

                        i.priority,
                        i.status,

                        i.image_url,
                        i.video_url,

                        i.visibility,

                        i.created_at,


                        u.name AS reported_by_name,

                        c.category_name,

                        d.department_name


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


                    WHERE

                        i.approver_id = $1

                        AND i.status =
                        'SUBMITTED'


                    ORDER BY
                        i.created_at DESC
                    `,

                    [
                        approverId
                    ]

                );


            res.status(200).json({

                message:
                    "Approver complaints fetched successfully",

                count:
                    result.rows.length,

                issues:
                    result.rows

            });


        } catch (error) {

            console.error(
                "Get approver issues error:",
                error
            );


            res.status(500).json({

                message:
                    "Failed to fetch approver complaints",

                error:
                    error.message

            });

        }

    }

);


// =====================================================
// APPROVE COMPLAINT
// =====================================================

router.put(
    "/:issueId/approve",

    async (req, res) => {

        try {

            const {
                issueId
            } = req.params;


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


            const issueResult =
                await pool.query(

                    `
                    SELECT *
                    FROM issues

                    WHERE
                        issue_id = $1
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
                Number(
                    issueResult.rows[0].approver_id
                ) !==
                Number(approver_id)
            ) {

                return res.status(403).json({

                    message:
                        "This complaint is not assigned to this approver"

                });

            }


            const result =
                await pool.query(

                    `
                    UPDATE issues

                    SET

                        status =
                        'VERIFIED',

                        approved_by =
                        $1,

                        approved_at =
                        CURRENT_TIMESTAMP,

                        updated_at =
                        CURRENT_TIMESTAMP

                    WHERE
                        issue_id = $2

                    RETURNING *
                    `,

                    [
                        approver_id,
                        issueId
                    ]

                );


            res.status(200).json({

                message:
                    "Complaint approved and sent to admin successfully",

                issue:
                    result.rows[0]

            });


        } catch (error) {

            console.error(
                "Approve complaint error:",
                error
            );


            res.status(500).json({

                message:
                    "Failed to approve complaint",

                error:
                    error.message

            });

        }

    }

);


// =====================================================
// REJECT COMPLAINT
// =====================================================

router.put(
    "/:issueId/reject",

    async (req, res) => {

        try {

            const {
                issueId
            } = req.params;


            const {
                approver_id,
                rejection_reason
            } = req.body;


            if (
                !approver_id ||
                !rejection_reason
            ) {

                return res.status(400).json({

                    message:
                        "Approver ID and rejection reason are required"

                });

            }


            const result =
                await pool.query(

                    `
                    UPDATE issues

                    SET

                        status =
                        'REJECTED',

                        approved_by =
                        $1,

                        rejection_reason =
                        $2,

                        updated_at =
                        CURRENT_TIMESTAMP

                    WHERE

                        issue_id = $3

                        AND approver_id = $1

                    RETURNING *
                    `,

                    [
                        approver_id,
                        rejection_reason,
                        issueId
                    ]

                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({

                    message:
                        "Complaint not found or not assigned to this approver"

                });

            }


            res.status(200).json({

                message:
                    "Complaint rejected successfully",

                issue:
                    result.rows[0]

            });


        } catch (error) {

            console.error(
                "Reject complaint error:",
                error
            );


            res.status(500).json({

                message:
                    "Failed to reject complaint",

                error:
                    error.message

            });

        }

    }

);


// =====================================================
// SUPPORT COMPLAINT
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
            } = req.body;


            if (!reported_by) {

                return res.status(400).json({

                    message:
                        "reported_by is required"

                });

            }


            const existingSupport =
                await pool.query(

                    `
                    SELECT *
                    FROM issue_supporters

                    WHERE
                        issue_id = $1

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
                        "You have already supported this issue"

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


            res.status(200).json({

                message:
                    "Complaint supported successfully"

            });


        } catch (error) {

            res.status(500).json({

                message:
                    "Failed to support complaint",

                error:
                    error.message

            });

        }

    }

);


module.exports = router;