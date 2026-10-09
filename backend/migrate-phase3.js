/**
 * Phase 3 Migration Script
 * 
 * Drops ALL old tables and re-creates the database
 * from the updated schema.sql.
 * 
 * Usage:  node migrate-phase3.js
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function migrate() {

    console.log("=== Phase 3 Migration ===\n");

    // ── Step 1: Drop old tables in dependency order ──
    console.log("1. Dropping old tables...");

    const dropSQL = `
        DROP TABLE IF EXISTS feedback           CASCADE;
        DROP TABLE IF EXISTS notifications      CASCADE;
        DROP TABLE IF EXISTS issue_status_history CASCADE;
        DROP TABLE IF EXISTS issue_comments     CASCADE;
        DROP TABLE IF EXISTS issue_supporters   CASCADE;
        DROP TABLE IF EXISTS issues             CASCADE;
        DROP TABLE IF EXISTS users              CASCADE;
        DROP TABLE IF EXISTS categories         CASCADE;
        DROP TABLE IF EXISTS departments        CASCADE;
        DROP TABLE IF EXISTS admin_types        CASCADE;

        DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
    `;

    await pool.query(dropSQL);
    console.log("   ✓ All old tables dropped\n");

    // ── Step 2: Run updated schema.sql ──
    console.log("2. Running updated schema.sql...");

    const schemaPath = path.join(__dirname, "schema.sql");
    const schemaSQL = fs.readFileSync(schemaPath, "utf-8");

    await pool.query(schemaSQL);
    console.log("   ✓ Schema created successfully\n");

    // ── Step 3: Verify ──
    console.log("3. Verifying tables...\n");

    const tables = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
    `);

    for (const row of tables.rows) {
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM "${row.table_name}"`
        );
        console.log(
            `   ${row.table_name}: ${countResult.rows[0].count} rows`
        );
    }

    // ── Step 4: Verify accounts ──
    console.log("\n4. Checking seeded accounts...\n");

    const users = await pool.query(`
        SELECT user_id, name, email, role, admin_type_id
        FROM users
        ORDER BY user_id
    `);

    for (const u of users.rows) {
        const label =
            u.admin_type_id === 9
                ? "APPROVER"
                : u.role;

        console.log(
            `   ${u.name} (${u.email}) → ${label}`
        );
    }

    console.log("\n=== Migration Complete ===");
    console.log("\nSeeded login credentials:");
    console.log("  Admin:    admin@campus.edu / admin123");
    console.log("  Approver: approver@campus.edu / admin123");
    console.log("  Student:  rahul@campus.edu / admin123");

    await pool.end();
}

migrate().catch((err) => {
    console.error("Migration failed:", err);
    pool.end();
    process.exit(1);
});
