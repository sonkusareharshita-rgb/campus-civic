-- ============================================================
-- Campus Civic — Full Database Schema
-- Run this against the "campus-civic" database
-- ============================================================

-- ── DEPARTMENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
    department_id   SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO departments (department_name) VALUES
    ('Computer Science'),
    ('Mechanical Engineering'),
    ('Electrical Engineering'),
    ('Civil Engineering'),
    ('Management'),
    ('Administration')
ON CONFLICT DO NOTHING;


-- ── CATEGORIES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    category_id   SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO categories (category_name) VALUES
    ('Electricity'),
    ('Water'),
    ('Cleanliness'),
    ('Infrastructure'),
    ('Wi-Fi / Internet'),
    ('Security'),
    ('Other')
ON CONFLICT DO NOTHING;


-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    user_id         SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'STUDENT'
                        CHECK (role IN ('STUDENT','FACULTY','ADMIN')),
    department_id   INT REFERENCES departments(department_id),
    year            INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default admin account (password: admin123)
INSERT INTO users (name, email, password_hash, role) VALUES
    ('Admin', 'admin@campus.edu',
     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
     'ADMIN')
ON CONFLICT DO NOTHING;


-- ── ISSUES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS issues (
    issue_id        SERIAL PRIMARY KEY,
    reported_by     INT NOT NULL REFERENCES users(user_id),
    category_id     INT NOT NULL REFERENCES categories(category_id),
    department_id   INT REFERENCES departments(department_id),
    title           VARCHAR(200) NOT NULL,
    description     TEXT NOT NULL,
    location        VARCHAR(300) NOT NULL,
    image_url       TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','APPROVED','IN_PROGRESS','RESOLVED','REJECTED')),
    priority        VARCHAR(10) NOT NULL DEFAULT 'MEDIUM'
                        CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    report_count    INT NOT NULL DEFAULT 1,
    resolution_note TEXT,
    resolution_image_url TEXT,
    assigned_to     INT REFERENCES users(user_id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── ISSUE SUPPORTERS (upvotes) ───────────────────────────────
CREATE TABLE IF NOT EXISTS issue_supporters (
    support_id  SERIAL PRIMARY KEY,
    issue_id    INT NOT NULL REFERENCES issues(issue_id) ON DELETE CASCADE,
    user_id     INT NOT NULL REFERENCES users(user_id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (issue_id, user_id)
);


-- ── COMMENTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS issue_comments (
    comment_id  SERIAL PRIMARY KEY,
    issue_id    INT NOT NULL REFERENCES issues(issue_id) ON DELETE CASCADE,
    user_id     INT NOT NULL REFERENCES users(user_id),
    comment     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── STATUS HISTORY ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS issue_status_history (
    history_id  SERIAL PRIMARY KEY,
    issue_id    INT NOT NULL REFERENCES issues(issue_id) ON DELETE CASCADE,
    old_status  VARCHAR(20),
    new_status  VARCHAR(20) NOT NULL,
    changed_by  INT REFERENCES users(user_id),
    note        TEXT,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── AUTO-UPDATE updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON issues;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ── SAMPLE DATA ───────────────────────────────────────────────
-- (Only inserted if issues table is empty)
DO $$
DECLARE
    student_id INT;
BEGIN
    -- Create a sample student user
    INSERT INTO users (name, email, password_hash, role, department_id, year)
    VALUES ('Rahul Sharma', 'rahul@campus.edu',
            '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
            'STUDENT', 1, 2)
    ON CONFLICT DO NOTHING
    RETURNING user_id INTO student_id;

    IF student_id IS NULL THEN
        SELECT user_id INTO student_id FROM users WHERE email = 'rahul@campus.edu';
    END IF;

    IF (SELECT COUNT(*) FROM issues) = 0 AND student_id IS NOT NULL THEN
        INSERT INTO issues (reported_by, category_id, title, description, location, status, priority, report_count)
        VALUES
            (student_id, 1, 'Street light not working near hostel',
             'The street light outside Block C hostel has been off for 3 days making it unsafe at night.',
             'Hostel Block C', 'PENDING', 'HIGH', 7),

            (student_id, 3, 'Washrooms near canteen are dirty',
             'The washrooms adjacent to the main canteen have not been cleaned since Monday.',
             'Canteen Area', 'IN_PROGRESS', 'MEDIUM', 12),

            (student_id, 5, 'Wi-Fi not working in Library',
             'Internet connectivity has been down in the entire library building since morning.',
             'Library — Ground Floor', 'PENDING', 'HIGH', 23),

            (student_id, 4, 'Broken bench in Computer Lab',
             'One of the benches in Lab 3 has a broken leg and is a safety hazard.',
             'Computer Lab — Lab 3', 'RESOLVED', 'LOW', 3),

            (student_id, 2, 'Water leakage in Block A corridor',
             'There is a continuous water drip from the ceiling in the Block A second floor corridor.',
             'Block A — 2nd Floor', 'PENDING', 'CRITICAL', 18);
    END IF;
END $$;

SELECT 'Schema created successfully!' AS result;
