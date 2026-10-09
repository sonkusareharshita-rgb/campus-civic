const { Pool } = require("pg");
require("dotenv").config();

// =============================================================
// POSTGRES CONNECTION POOL — robust config to prevent hangs
// =============================================================

const pool = new Pool({
    user:     process.env.DB_USER,
    host:     process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port:     Number(process.env.DB_PORT) || 5432,

    // Pool sizing
    max: 10,   // max concurrent connections (default is 10, set explicitly)
    min: 2,    // keep 2 warm at all times to avoid cold-start latency

    // If the pool is exhausted, wait max 5 s for a free connection.
    // Without this, queries queue indefinitely and the server freezes.
    connectionTimeoutMillis: 5000,

    // Close idle connections after 30 s to avoid stale connection issues.
    idleTimeoutMillis: 30000,

    // TCP keep-alive to prevent silent connection drops behind NAT/firewalls.
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
});

// ── Set statement_timeout on every new connection ────────────
// This is the root fix for hanging queries. Any query that takes
// longer than 12 seconds will be automatically cancelled by Postgres,
// returning an error to the caller instead of hanging forever.
pool.on("connect", (client) => {
    client.query("SET statement_timeout = '12000'").catch((err) => {
        // Non-fatal — just log it
        console.warn("[DB] Could not set statement_timeout:", err.message);
    });
});

// ── Pool-level error handler ──────────────────────────────────
// Without this, an idle client error is an uncaught exception
// that crashes (or zombifies) the process.
pool.on("error", (err) => {
    console.error("[DB] Unexpected pool client error:", err.message);
    // The pool will automatically create a replacement connection.
    // Do NOT exit here — just log and continue.
});

module.exports = pool;