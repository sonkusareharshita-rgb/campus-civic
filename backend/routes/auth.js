const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db");

const router = express.Router();

// =========================
// REGISTER
// =========================
router.post("/register", async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role,
            department_id,
            year,
            admin_type_id
        } = req.body;

        // Basic validation
        if (!name || !email || !password || !role) {
            return res.status(400).json({
                message: "Name, email, password and role are required"
            });
        }

        const userRole = role.toUpperCase();

        // Validate role
        if (!["STUDENT", "FACULTY", "ADMIN"].includes(userRole)) {
            return res.status(400).json({
                message: "Invalid role"
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

        // Admin validation
        if (userRole === "ADMIN") {
            if (!admin_type_id) {
                return res.status(400).json({
                    message: "Admin type is required"
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

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
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
                hashedPassword,
                userRole,
                userRole === "STUDENT" || userRole === "FACULTY"
                    ? department_id
                    : null,
                userRole === "STUDENT"
                    ? year
                    : null,
                userRole === "ADMIN"
                    ? admin_type_id
                    : null
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


// =========================
// LOGIN
// =========================
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

        // Check password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Remove password from response
        delete user.password;

        res.json({
            message: "Login successful",
            user: user
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


module.exports = router;