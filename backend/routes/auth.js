const express = require("express");
const pool = require("../db");

const router = express.Router();

// ======================================================
// REGISTER STUDENT / FACULTY
// ======================================================

router.post("/register", async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role,
            department_id,
            year
        } = req.body;

        // Basic validation
        if (!name || !email || !password || !role) {
            return res.status(400).json({
                message: "Name, email, password and role are required"
            });
        }

        const userRole = role.toUpperCase();

        // Public registration ONLY for Student / Faculty
        if (!["STUDENT", "FACULTY"].includes(userRole)) {
            return res.status(403).json({
                message:
                    "Administrator accounts cannot be created through public registration"
            });
        }

        // Student validation
        if (userRole === "STUDENT") {
            if (!department_id || !year) {
                return res.status(400).json({
                    message: "Student must provide department and year"
                });
            }
        }

        // Faculty validation
        if (userRole === "FACULTY") {
            if (!department_id) {
                return res.status(400).json({
                    message: "Faculty must provide department"
                });
            }
        }

        // Check existing email
        const existingUser = await pool.query(
            "SELECT user_id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        // ==================================================
        // PLAIN TEXT PASSWORD
        // ==================================================

        const userPassword = password;

        // Create Student / Faculty
        const result = await pool.query(
            `INSERT INTO users
            (
                name,
                email,
                password,
                role,
                department_id,
                year,
                admin_type_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING
                user_id,
                name,
                email,
                role,
                department_id,
                year,
                admin_type_id,
                created_at`,
            [
                name,
                email,
                userPassword,
                userRole,
                department_id,
                userRole === "STUDENT"
                    ? (parseInt(year) || null)
                    : null,
                null
            ]
        );

        res.status(201).json({
            message: "Registration successful",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Registration error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


// ======================================================
// LOGIN
// ======================================================

router.post("/login", async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        // Find user
        const result = await pool.query(
            `SELECT
                user_id,
                name,
                email,
                password,
                role,
                department_id,
                year,
                admin_type_id
             FROM users
             WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];
        console.log("LOGIN DEBUG:", {
    emailFromDB: user.email,
    passwordLength: user.password?.length,
    passwordType: typeof user.password
});


        // ==================================================
        // PLAIN TEXT PASSWORD CHECK
        // ==================================================

        const passwordMatch = password === user.password;

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Never send password to frontend
        delete user.password;

        res.json({
            message: "Login successful",
            user
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


// ======================================================
// CREATE ADMIN
// ======================================================

router.post("/create-admin", async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            admin_type_id
        } = req.body;

        // Basic validation
        if (!name || !email || !password || !admin_type_id) {
            return res.status(400).json({
                message:
                    "Name, email, password and admin type are required"
            });
        }

        // Check existing email
        const existingUser = await pool.query(
            "SELECT user_id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        // ==================================================
        // PLAIN TEXT PASSWORD
        // ==================================================

        const adminPassword = password;

        // Create admin
        const result = await pool.query(
            `INSERT INTO users
            (
                name,
                email,
                password,
                role,
                department_id,
                year,
                admin_type_id
            )
            VALUES ($1, $2, $3, 'ADMIN', NULL, NULL, $4)
            RETURNING
                user_id,
                name,
                email,
                role,
                admin_type_id,
                created_at`,
            [
                name,
                email,
                adminPassword,
                admin_type_id
            ]
        );

        res.status(201).json({
            message: "Administrator created successfully",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Create admin error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;