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
            priority
        } = req.body;

        // Required field validation
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

        // Insert issue
        const result = await pool.query(
            `INSERT INTO issues
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
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
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

        console.log("Issue created:", result.rows[0]);

        res.status(201).json({
            message: "Issue created successfully",
            issue: result.rows[0]
        });

    } catch (error) {
        console.error("Create issue error:", error);

        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
});


// =====================================================
// GET ALL ISSUES
// GET /api/issues
// =====================================================
router.get("/all", async (req, res) => {
    console.log("GET /api/issues ROUTE HIT");

    try {

        const result = await pool.query(
            `SELECT
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

                d.department_name

             FROM issues i

             JOIN users u
                ON i.reported_by = u.user_id

             JOIN categories c
                ON i.category_id = c.category_id

             LEFT JOIN departments d
                ON i.department_id = d.department_id

             ORDER BY i.created_at DESC`
        );

        console.log("Issues fetched:", result.rows.length);

        res.status(200).json({
            message: "Issues fetched successfully",
            count: result.rows.length,
            issues: result.rows
        });

    } catch (error) {

        console.error("Get issues error:", error);

        res.status(500).json({
            message: "Failed to fetch issues",
            error: error.message
        });
    }
});


module.exports = router;