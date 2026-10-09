const express   = require("express");
const cors      = require("cors");
const path      = require("path");
const http      = require("http");
const pool      = require("./db");
const rateLimit = require("express-rate-limit");

require("dotenv").config();

const authRoutes  = require("./routes/auth");
const issueRoutes = require("./routes/issues");
const aiRoutes    = require("./routes/ai");

const app    = express();
const server = http.createServer(app);


// =====================================================
// GLOBAL CRASH SAFETY — must be first
// =====================================================

// Without these, a single unhandled rejection/exception can
// silently freeze or zombie the process while "still running"
// in the terminal (the event loop gets stuck).

process.on("unhandledRejection", (reason, promise) => {
    console.error("[SERVER] Unhandled Promise Rejection:", reason);
    // Do NOT call process.exit() here — just log and keep running.
    // If you want auto-restart, use a process manager (pm2/nodemon).
});

process.on("uncaughtException", (err) => {
    console.error("[SERVER] Uncaught Exception:", err);
    // For truly fatal errors we exit so a process manager can restart us.
    // Silently swallowing uncaught exceptions leaves the server in a
    // broken state (zombie), which is the bug you were hitting.
    process.exit(1);
});


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:3000",
        ],
        credentials: true,
    })
);

app.use(express.json({ limit: "10mb" }));

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb",
    })
);


// =====================================================
// REQUEST TIMEOUT MIDDLEWARE
// =====================================================

// Every incoming request gets a hard 30-second timeout.
// AI routes might take longer — they handle their own timeout.
// This prevents requests from hanging forever and blocking the
// event loop / connection pool.

const REQUEST_TIMEOUT_MS = 30_000; // 30 seconds

app.use((req, res, next) => {
    // Skip timeout for AI routes (they have their own internal timeout)
    if (req.path.startsWith("/api/ai")) {
        res.setTimeout(60_000, () => {
            if (!res.headersSent) {
                console.warn(`[TIMEOUT] AI route timed out: ${req.method} ${req.path}`);
                res.status(503).json({ message: "AI request timed out. Please try again." });
            }
        });
    } else {
        res.setTimeout(REQUEST_TIMEOUT_MS, () => {
            if (!res.headersSent) {
                console.warn(`[TIMEOUT] Request timed out: ${req.method} ${req.path}`);
                res.status(503).json({ message: "Request timed out. Please try again." });
            }
        });
    }
    next();
});


// =====================================================
// RATE LIMITING
// =====================================================

// Global: 300 requests per 15 minutes (generous for dev/testing)
const globalLimiter = rateLimit({
    windowMs:  15 * 60 * 1000,
    max:       300,
    message:   { message: "Too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders:   false,
    skip: (req) => req.path === "/api/test-db" || req.path === "/",
});

// Auth: 20 attempts per 15 minutes (login/register)
const authLimiter = rateLimit({
    windowMs:  15 * 60 * 1000,
    max:       20,
    message:   { message: "Too many login attempts, please try again in 15 minutes" },
    standardHeaders: true,
    legacyHeaders:   false,
});

// Issue creation: 50 per hour
const issueLimiter = rateLimit({
    windowMs:  60 * 60 * 1000,
    max:       50,
    message:   { message: "Too many issue submissions, please slow down" },
    standardHeaders: true,
    legacyHeaders:   false,
});

app.use(globalLimiter);


// =====================================================
// SERVE UPLOADED FILES
// =====================================================

app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);


// =====================================================
// ROUTES
// =====================================================

app.use("/api/auth",   authRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/ai",     aiRoutes);


// =====================================================
// HOME / HEALTH ROUTE
// =====================================================

app.get("/", (req, res) => {
    res.json({
        message: "Campus Civic API is running",
        status:  "ok",
        time:    new Date().toISOString(),
    });
});


// =====================================================
// DATABASE HEALTH CHECK
// =====================================================

app.get("/api/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        res.status(200).json({
            message: "Database connected successfully",
            time:    result.rows[0].now,
        });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({
            message: "Database connection failed",
            error:   error.message,
        });
    }
});


// =====================================================
// 404
// =====================================================

app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});


// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
    console.error("[EXPRESS ERROR]", error);

    if (res.headersSent) return;   // can't send twice

    res.status(error.status || 500).json({
        message: error.message || "Internal server error",
    });
});


// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================

async function shutdown(signal) {
    console.log(`\n[SERVER] ${signal} received — shutting down gracefully…`);

    server.close(async () => {
        console.log("[SERVER] HTTP server closed");
        try {
            await pool.end();
            console.log("[DB] Connection pool closed");
        } catch (e) {
            console.error("[DB] Error closing pool:", e.message);
        }
        process.exit(0);
    });

    // Force exit after 10 s if graceful shutdown hangs
    setTimeout(() => {
        console.error("[SERVER] Forced exit after 10 s timeout");
        process.exit(1);
    }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));


// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`[SERVER] Running on http://localhost:${PORT}`);
    console.log(`[SERVER] Uploads at http://localhost:${PORT}/uploads`);
    console.log(`[SERVER] Environment: ${process.env.NODE_ENV || "development"}`);
});