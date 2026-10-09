const pool = require('./db');

async function run() {
  const deptAdminTypes = [
    [2, 'Electricity Admin'],
    [3, 'Water Admin'],
    [4, 'Cleanliness Admin'],
    [5, 'Infrastructure Admin'],
    [6, 'Wi-Fi / Internet Admin'],
    [7, 'Security Admin'],
    [8, 'Department Admin'],
  ];

  for (const [id, name] of deptAdminTypes) {
    await pool.query(
      'INSERT INTO admin_types (admin_type_id, type_name) VALUES ($1, $2) ON CONFLICT (admin_type_id) DO UPDATE SET type_name = $2',
      [id, name]
    );
  }

  const r = await pool.query('SELECT * FROM admin_types ORDER BY admin_type_id');
  console.log('Admin types seeded:');
  console.log(JSON.stringify(r.rows, null, 2));
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
