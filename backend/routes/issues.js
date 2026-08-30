const express = require("express");
const pool = require("../db");

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
        // DUPLICATE COMPLAINT CHECK
        // -------------------------------------------------

        if (!force_create) {

            const duplicateResult = await pool.query(
                `
                SELECT
                    i.issue_id,
                    i.title,
                    i.description,
                    i.location,
                    i.status,
                    i.priority,
                    i.created_at,
                    c.category_name,
                    COUNT(*) OVER (
                        PARTITION BY
                            i.category_id,
                            LOWER(TRIM(i.location))
                    ) AS report_count

                FROM issues i

                JOIN categories c
                    ON i.category_id = c.category_id

                WHERE
                    i.category_id = $1

                    AND LOWER(TRIM(i.location))
                        = LOWER(TRIM($2))

                    AND i.status IN
                        ('PENDING', 'IN_PROGRESS')

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


            // -------------------------------------------------
            // DUPLICATE FOUND
            // -------------------------------------------------

            if (duplicateResult.rows.length > 0) {

                const duplicate =
                    duplicateResult.rows[0];


                return res.status(409).json({

                    duplicate: true,

                    message:
                        "A similar complaint already exists.",

                    existing_issue: duplicate

                });

            }

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
                priority || "MEDIUM"
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


module.exports = router;