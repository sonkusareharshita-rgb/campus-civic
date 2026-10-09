require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

async function addIndexes() {
    console.log("Adding indexes to 'issues' table...");
    try {
        await pool.query("CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues(created_at DESC);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_issues_department ON issues(department_id);");
        console.log("Indexes added successfully!");
    } catch (err) {
        console.error("Error adding indexes:", err);
    } finally {
        pool.end();
    }
}

addIndexes();
