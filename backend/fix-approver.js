require('dotenv').config();
const pool = require('./db');
pool.query("UPDATE users SET admin_type_id = 9 WHERE email = 'authority@campus.edu' OR email = 'admin@campus.edu'")
    .then(r => { console.log('Updated', r.rowCount, 'rows'); pool.end(); })
    .catch(e => { console.error(e.message); pool.end(); });
