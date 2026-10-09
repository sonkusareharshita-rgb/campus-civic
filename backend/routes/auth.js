const express = require("express");
const bcrypt  = require("bcrypt");
const jwt     = require("jsonwebtoken");
const pool    = require("../db");

const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'dummy_client_id');

// ======================================================
// GOOGLE OAUTH LOGIN / REGISTER
// ======================================================

router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ message: 'Google credential missing' });
        }

        // Verify the Google token
        let payload;
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            payload = ticket.getPayload();
        } catch (verifyError) {
            console.error("Google token verification failed:", verifyError.message);
            return res.status(401).json({ message: 'Invalid Google token. Check your Google Client ID configuration.' });
        }

        const { email, name } = payload;

        // Check if user already exists
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userCheck.rows.length > 0) {
            // ── EXISTING USER: log them in immediately ──
            const user = userCheck.rows[0];
            const token = signToken(user);
            return res.json({
                needs_profile: false,
                token,
                user: {
                    user_id:      user.user_id,
                    name:         user.name,
                    email:        user.email,
                    role:         user.role,
                    admin_type_id: user.admin_type_id
                }
            });
        } else {
            // ── NEW USER: tell the frontend to collect dept/year first ──
            return res.status(200).json({
                needs_profile: true,
                google_name:  name  || email.split('@')[0],
                google_email: email
            });
        }

    } catch (err) {
        console.error("Google Auth error:", err);
        res.status(500).json({ message: "Server error during Google auth" });
    }
});

const JWT_SECRET  = process.env.JWT_SECRET  || "campus_civic_jwt_secret_key_2026";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

function signToken(user) {
    return jwt.sign(
        {
            user_id:      user.user_id,
            email:        user.email,
            role:         user.role,
            admin_type_id: user.admin_type_id || null
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
    );
}

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

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

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
                hashedPassword,
                userRole,
                department_id,
                userRole === "STUDENT"
                    ? (parseInt(year) || null)
                    : null,
                null
            ]
        );

        const newUser = result.rows[0];
        const token   = signToken(newUser);

        res.status(201).json({
            message: "Registration successful",
            token,
            user: newUser
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

        // Never send password to frontend
        delete user.password;

        const token = signToken(user);

        res.json({
            message: "Login successful",
            token,
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

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

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
                hashedPassword,
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
// VERIFY TOKEN — GET /api/auth/me
// ======================================================

router.get("/me", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.slice(7);

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        res.json({ valid: true, user: payload });
    } catch {
        res.status(401).json({ valid: false, message: "Token invalid or expired" });
    }
});


// ======================================================
// CREATE DEPARTMENT ADMIN — POST /api/auth/create-department-admin
// Super admin (admin_type_id=1) only
// ======================================================

router.post("/create-department-admin", async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            department_id,
            admin_type_id,   // e.g. 2–8 for dept admins
            created_by       // user_id of the super admin making this request
        } = req.body;

        if (!name || !email || !password || !department_id || !admin_type_id || !created_by) {
            return res.status(400).json({
                message: "name, email, password, department_id, admin_type_id and created_by are required"
            });
        }

        // Verify the requester is a super admin (admin_type_id = 1)
        const requester = await pool.query(
            "SELECT user_id, admin_type_id FROM users WHERE user_id = $1 AND role = 'ADMIN'",
            [created_by]
        );

        if (requester.rows.length === 0 || Number(requester.rows[0].admin_type_id) !== 1) {
            return res.status(403).json({
                message: "Only Super Admin can create department administrators"
            });
        }

        // Check email collision
        const existing = await pool.query(
            "SELECT user_id FROM users WHERE email = $1",
            [email]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users
             (name, email, password, role, department_id, year, admin_type_id)
             VALUES ($1, $2, $3, 'ADMIN', $4, NULL, $5)
             RETURNING user_id, name, email, role, department_id, admin_type_id, created_at`,
            [name, email, hashedPassword, department_id, admin_type_id]
        );

        res.status(201).json({
            message: "Department administrator created successfully",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Create dept admin error:", error);
        res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// LIST DEPARTMENT ADMINS — GET /api/auth/department-admins
// ======================================================

router.get("/department-admins", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                u.user_id,
                u.name,
                u.email,
                u.admin_type_id,
                u.created_at,
                d.department_name,
                at.type_name AS admin_type_name
             FROM users u
             LEFT JOIN departments d     ON u.department_id = d.department_id
             LEFT JOIN admin_types  at   ON u.admin_type_id  = at.admin_type_id
             WHERE u.role = 'ADMIN'
             ORDER BY u.admin_type_id, u.created_at`
        );

        res.json({ admins: result.rows });
    } catch (error) {
        console.error("List dept admins error:", error);
        res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// LIST DEPARTMENTS — GET /api/auth/departments
// ======================================================

router.get("/departments", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT department_id, department_name
             FROM departments
             ORDER BY department_name`
        );
        res.json({ departments: result.rows });
    } catch (error) {
        console.error("List departments error:", error);
        res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// EXPORT ROUTER
// ======================================================

// ======================================================
// DELETE DEPARTMENT ADMIN — DELETE /api/auth/department-admin/:id
// ======================================================

router.delete("/department-admin/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Prevent deleting Super Admin
        const check = await pool.query("SELECT admin_type_id FROM users WHERE user_id = $1", [id]);
        if (check.rows.length > 0 && Number(check.rows[0].admin_type_id) === 1) {
            return res.status(403).json({ message: "Cannot delete Super Admin" });
        }

        await pool.query("DELETE FROM users WHERE user_id = $1", [id]);
        res.json({ message: "Administrator deleted successfully" });
    } catch (error) {
        console.error("Delete admin error:", error);
        res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// UPDATE DEPARTMENT ADMIN — PUT /api/auth/department-admin/:id
// ======================================================

router.put("/department-admin/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, department_id, admin_type_id, password } = req.body;
        
        // Prevent editing Super Admin
        const check = await pool.query("SELECT admin_type_id FROM users WHERE user_id = $1", [id]);
        if (check.rows.length === 0) return res.status(404).json({ message: "Admin not found" });
        if (Number(check.rows[0].admin_type_id) === 1) {
            return res.status(403).json({ message: "Cannot edit Super Admin this way" });
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(
                "UPDATE users SET name=$1, email=$2, department_id=$3, admin_type_id=$4, password=$5 WHERE user_id=$6",
                [name, email, department_id, admin_type_id, hashedPassword, id]
            );
        } else {
            await pool.query(
                "UPDATE users SET name=$1, email=$2, department_id=$3, admin_type_id=$4 WHERE user_id=$5",
                [name, email, department_id, admin_type_id, id]
            );
        }

        res.json({ message: "Administrator updated successfully" });
    } catch (error) {
        console.error("Update admin error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;