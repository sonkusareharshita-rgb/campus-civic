const express = require("express");
const cors = require("cors");
const pool = require("./db");

require("dotenv").config();

const authRoutes = require("./routes/auth");
const issueRoutes = require("./routes/issues");
console.log("ISSUE ROUTES LOADED:", typeof issueRoutes);

const app = express();


// =========================
// MIDDLEWARE
// =========================

app.use(cors());
app.use(express.json());


// =========================
// AUTHENTICATION ROUTES
// =========================

app.use("/api/auth", authRoutes);


// =========================
// ISSUE / COMPLAINT ROUTES
// =========================

app.use("/api/issues", issueRoutes);


// =========================
// HOME ROUTE
// =========================

app.get("/", (req, res) => {
    res.json({
        message: "Campus Civic API is running"
    });
});


// =========================
// DATABASE TEST ROUTE
// =========================

app.get("/api/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            message: "Database connected successfully",
            time: result.rows[0].now
        });

    } catch (error) {
        console.error("Database error:", error);

        res.status(500).json({
            message: "Database connection failed"
        });
    }
});


// =========================
// START SERVER
// =========================

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});