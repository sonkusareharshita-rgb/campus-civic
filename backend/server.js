const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./db");

require("dotenv").config();

const authRoutes = require("./routes/auth");
const issueRoutes = require("./routes/issues");

const app = express();


// =====================================
// MIDDLEWARE
// =====================================

app.use(
    cors({
        origin: "http://localhost:5173"
    })
);

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// =====================================
// SERVE UPLOADED FILES
// =====================================

// This makes uploaded images/videos accessible
// Example:
// http://localhost:5000/uploads/filename.jpg

app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);


// =====================================
// AUTH ROUTES
// =====================================

app.use(
    "/api/auth",
    authRoutes
);


// =====================================
// ISSUE ROUTES
// =====================================

app.use(
    "/api/issues",
    issueRoutes
);


// =====================================
// HOME ROUTE
// =====================================

app.get("/", (req, res) => {

    res.json({
        message: "Campus Civic API is running successfully"
    });

});


// =====================================
// DATABASE TEST ROUTE
// =====================================

app.get(
    "/api/test-db",
    async (req, res) => {

        try {

            const result = await pool.query(
                "SELECT NOW()"
            );

            res.status(200).json({

                message:
                    "Database connected successfully",

                time:
                    result.rows[0].now

            });

        } catch (error) {

            console.error(
                "Database error:",
                error
            );

            res.status(500).json({

                message:
                    "Database connection failed",

                error:
                    error.message

            });

        }

    }
);


// =====================================
// 404 ROUTE
// =====================================

app.use((req, res) => {

    res.status(404).json({
        message: "Route not found"
    });

});


// =====================================
// ERROR HANDLER
// =====================================

app.use((error, req, res, next) => {

    console.error(
        "Server error:",
        error
    );

    res.status(500).json({

        message:
            error.message ||
            "Internal server error"

    });

});


// =====================================
// START SERVER
// =====================================

const PORT =
    process.env.PORT || 5000;


app.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );

    console.log(
        `Uploads available at http://localhost:${PORT}/uploads`
    );

});