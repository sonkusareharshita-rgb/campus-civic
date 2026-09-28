require('dotenv').config();
const pool = require('./db');
const bcrypt = require('bcrypt');

async function seed() {
    const hash = await bcrypt.hash('password123', 10);
    
    // Check actual password column name
    const colCheck = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name LIKE '%pass%'"
    );
    console.log('Password columns:', colCheck.rows.map(c => c.column_name));
    const passCol = colCheck.rows[0].column_name; // 'password' or 'password_hash'

    // ── 1. Create AUTHORITY / APPROVER user ──
    const authorityCheck = await pool.query("SELECT user_id FROM users WHERE email = 'authority@campus.edu'");
    let authorityId;
    if (authorityCheck.rows.length === 0) {
        const r = await pool.query(
            `INSERT INTO users (name, email, ${passCol}, role, department_id)
             VALUES ('Prof. Meena Gupta', 'authority@campus.edu', $1, 'ADMIN', 6)
             RETURNING user_id`,
            [hash]
        );
        authorityId = r.rows[0].user_id;
        console.log('Created AUTHORITY user (authority@campus.edu) id:', authorityId);
    } else {
        authorityId = authorityCheck.rows[0].user_id;
        await pool.query(`UPDATE users SET ${passCol} = $1 WHERE email = 'authority@campus.edu'`, [hash]);
        console.log('AUTHORITY user exists, password reset. id:', authorityId);
    }

    // ── 2. Reset admin password too ──
    await pool.query(`UPDATE users SET ${passCol} = $1 WHERE email = 'admin@campus.edu'`, [hash]);
    console.log('Admin password reset to password123');

    // ── 3. Create extra student users ──
    const students = [
        { name: 'Priya Patel',    email: 'priya@campus.edu',    dept: 1, year: 3 },
        { name: 'Amit Kumar',     email: 'amit@campus.edu',     dept: 2, year: 1 },
        { name: 'Sneha Reddy',    email: 'sneha@campus.edu',    dept: 3, year: 2 },
        { name: 'Vikram Singh',   email: 'vikram@campus.edu',   dept: 4, year: 4 },
        { name: 'Anjali Deshmukh',email: 'anjali@campus.edu',   dept: 5, year: 2 },
    ];
    
    const studentIds = [];
    for (const s of students) {
        const check = await pool.query("SELECT user_id FROM users WHERE email = $1", [s.email]);
        if (check.rows.length === 0) {
            const r = await pool.query(
                `INSERT INTO users (name, email, ${passCol}, role, department_id, year)
                 VALUES ($1, $2, $3, 'STUDENT', $4, $5) RETURNING user_id`,
                [s.name, s.email, hash, s.dept, s.year]
            );
            studentIds.push(r.rows[0].user_id);
            console.log(`Created student: ${s.name} (${s.email})`);
        } else {
            studentIds.push(check.rows[0].user_id);
            console.log(`Student ${s.email} already exists`);
        }
    }
    
    // Also include rahul (id 2) in the pool
    studentIds.push(2);

    // ── 4. Insert dummy issues with photo URLs (placeholder campus photos) ──
    const dummyIssues = [
        {
            reported_by: studentIds[0], category_id: 1,
            title: 'Flickering lights in Block A corridor',
            description: 'The tube lights in the Block A 3rd floor corridor have been flickering non-stop for the last week, causing headaches during evening study hours.',
            location: 'Block A — 3rd Floor',
            image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop',
            status: 'PENDING', priority: 'MEDIUM', report_count: 5
        },
        {
            reported_by: studentIds[1], category_id: 2,
            title: 'Overflowing water tank near sports ground',
            description: 'The overhead water tank near the sports ground has been overflowing continuously, wasting water and creating a muddy mess on the track.',
            location: 'Sports Ground',
            image_url: 'https://images.unsplash.com/photo-1504972891510-70aea2de30aa?w=400&h=300&fit=crop',
            status: 'PENDING', priority: 'HIGH', report_count: 14
        },
        {
            reported_by: studentIds[2], category_id: 3,
            title: 'Garbage piling up behind hostel',
            description: 'Garbage collection has not happened for 4 days behind the girls hostel. The smell is unbearable and stray animals are gathering.',
            location: 'Hostel Block',
            image_url: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=400&h=300&fit=crop',
            status: 'PENDING', priority: 'CRITICAL', report_count: 31
        },
        {
            reported_by: studentIds[3], category_id: 4,
            title: 'Cracked staircase railing in Main Building',
            description: 'The metal railing on the main building staircase (near Room 201) is cracked and wobbles dangerously. Someone could fall.',
            location: 'Main Building',
            image_url: 'https://images.unsplash.com/photo-1541123603104-512919d6a96c?w=400&h=300&fit=crop',
            status: 'IN_PROGRESS', priority: 'HIGH', report_count: 9
        },
        {
            reported_by: studentIds[4], category_id: 6,
            title: 'CCTV camera not working at parking lot',
            description: 'The CCTV camera at the main parking entrance has been dead for over a week. Two bike thefts were reported last month.',
            location: 'Parking Area',
            image_url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400&h=300&fit=crop',
            status: 'PENDING', priority: 'HIGH', report_count: 16
        },
        {
            reported_by: studentIds[0], category_id: 5,
            title: 'Extremely slow WiFi in Computer Lab',
            description: 'Internet speed in the Computer Lab drops to less than 1 Mbps during afternoon hours, making it impossible to access coding platforms.',
            location: 'Computer Lab',
            image_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=300&fit=crop',
            status: 'PENDING', priority: 'MEDIUM', report_count: 22
        },
        {
            reported_by: studentIds[2], category_id: 2,
            title: 'No water supply in Block B washrooms',
            description: 'There has been zero water supply in all Block B washrooms since yesterday morning. Students have to go to Block A to use facilities.',
            location: 'Block B — All Floors',
            image_url: 'https://images.unsplash.com/photo-1585128993280-9456c19c987d?w=400&h=300&fit=crop',
            status: 'PENDING', priority: 'CRITICAL', report_count: 27
        },
        {
            reported_by: studentIds[3], category_id: 7,
            title: 'AC not working in Auditorium',
            description: 'The central AC in the auditorium has been broken for the entire month. Events are unbearable in the heat.',
            location: 'Auditorium',
            image_url: 'https://images.unsplash.com/photo-1631545806609-8baa8b82a5e3?w=400&h=300&fit=crop',
            status: 'IN_PROGRESS', priority: 'MEDIUM', report_count: 11
        },
    ];

    let insertedCount = 0;
    for (const iss of dummyIssues) {
        // Check if a similar title already exists
        const exists = await pool.query("SELECT 1 FROM issues WHERE title = $1", [iss.title]);
        if (exists.rows.length === 0) {
            await pool.query(
                `INSERT INTO issues (reported_by, category_id, title, description, location, image_url, status, priority, report_count)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [iss.reported_by, iss.category_id, iss.title, iss.description, iss.location, iss.image_url, iss.status, iss.priority, iss.report_count]
            );
            insertedCount++;
        }
    }
    console.log(`Inserted ${insertedCount} new issues with photos`);

    // ── 5. Print all accounts ──
    console.log('\n========================================');
    console.log('  ALL LOGIN CREDENTIALS (password123)');
    console.log('========================================');
    const allUsers = await pool.query('SELECT user_id, name, email, role FROM users ORDER BY user_id');
    for (const u of allUsers.rows) {
        console.log(`  ${u.role.padEnd(8)} | ${u.email.padEnd(25)} | ${u.name}`);
    }
    console.log('========================================\n');

    pool.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
