const express = require("express");
const pool = require("../db");

const router = express.Router();

// =========================
// CREATE ISSUE / COMPLAINT
// =========================

router.post("/", async (req, res) => {
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

        // Required fields validation
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

        // Insert issue into database
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

        res.status(201).json({
            message: "Issue created successfully",
            issue: result.rows[0]
        });

    } catch (error) {
        console.error("Create issue error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


// =========================
// GET ALL ISSUES
// =========================

router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                i.*,
                u.name AS reported_by_name,
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

        res.json({
            message: "Issues fetched successfully",
            issues: result.rows
        });

    } catch (error) {
        console.error("Get issues error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


module.exports = router;