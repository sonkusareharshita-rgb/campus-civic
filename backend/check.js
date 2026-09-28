require('dotenv').config();
const pool = require('./db');

async function check() {
    // Check if admin_type_id column exists
    const cols = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
    );
    console.log('Users columns:', cols.rows.map(c => c.column_name));

    // Check authority user
    const u = await pool.query("SELECT * FROM users WHERE email = 'authority@campus.edu'");
    console.log('Authority user:', JSON.stringify(u.rows[0], null, 2));

    pool.end();
}
check();
