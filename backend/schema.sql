-- ============================================================
-- Campus Civic — Full Database Schema (Phase 3)
-- Run this against the "campus-civic" database
-- ============================================================


-- ── ADMIN TYPES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_types (
    admin_type_id   SERIAL PRIMARY KEY,
    type_name       VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO admin_types (admin_type_id, type_name) VALUES
    (1, 'Super Admin'),
    (9, 'Approver')
ON CONFLICT DO NOTHING;


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
    password        TEXT NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'STUDENT'
                        CHECK (role IN ('STUDENT','FACULTY','ADMIN')),
    department_id   INT REFERENCES departments(department_id),
    year            INT,
    admin_type_id   INT REFERENCES admin_types(admin_type_id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default admin account (password: admin123)
INSERT INTO users (name, email, password, role, admin_type_id) VALUES
    ('Admin', 'admin@campus.edu',
     '$2b$10$XMgwtk9bETwQwWUbva9KHeBbTH2mnvYlwQHN6hA/YaR1fJ2dbG7Ca',
     'ADMIN', 1)
ON CONFLICT DO NOTHING;

-- Default approver account (password: admin123)
INSERT INTO users (name, email, password, role, admin_type_id) VALUES
    ('Campus Approver', 'approver@campus.edu',
     '$2b$10$XMgwtk9bETwQwWUbva9KHeBbTH2mnvYlwQHN6hA/YaR1fJ2dbG7Ca',
     'ADMIN', 9)
ON CONFLICT DO NOTHING;


-- ── ISSUES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS issues (
    issue_id            SERIAL PRIMARY KEY,
    reported_by         INT NOT NULL REFERENCES users(user_id),
    category_id         INT NOT NULL REFERENCES categories(category_id),
    department_id       INT REFERENCES departments(department_id),

    title               VARCHAR(200) NOT NULL,
    description         TEXT NOT NULL,
    location            VARCHAR(300) NOT NULL,

    image_url           TEXT,
    video_url           TEXT,

    visibility          VARCHAR(20) NOT NULL DEFAULT 'PUBLIC'
                            CHECK (visibility IN ('PUBLIC','PRIVATE')),

    status              VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED'
                            CHECK (status IN (
                                'SUBMITTED',
                                'VERIFIED',
                                'ASSIGNED',
                                'IN_PROGRESS',
                                'RESOLVED',
                                'CLOSED',
                                'REJECTED'
                            )),

    priority            VARCHAR(10) NOT NULL DEFAULT 'MEDIUM'
                            CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),

    report_count        INT NOT NULL DEFAULT 1,
    is_anonymous        BOOLEAN NOT NULL DEFAULT false,

    -- Approver fields
    approver_id         INT REFERENCES users(user_id),
    approved_by         INT REFERENCES users(user_id),
    approved_at         TIMESTAMPTZ,
    rejection_reason    TEXT,

    -- Resolution fields
    resolution_note     TEXT,
    resolution_image_url TEXT,
    resolved_at         TIMESTAMPTZ,

    assigned_to         INT REFERENCES users(user_id),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── ISSUE SUPPORTERS (upvotes) ───────────────────────────────
CREATE TABLE IF NOT EXISTS issue_supporters (
    support_id      SERIAL PRIMARY KEY,
    issue_id        INT NOT NULL REFERENCES issues(issue_id) ON DELETE CASCADE,
    user_id         INT NOT NULL REFERENCES users(user_id),
    supported_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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


-- ── NOTIFICATIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(user_id),
    issue_id        INT REFERENCES issues(issue_id) ON DELETE CASCADE,
    message         TEXT NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── FEEDBACK ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
    feedback_id SERIAL PRIMARY KEY,
    issue_id    INT NOT NULL REFERENCES issues(issue_id) ON DELETE CASCADE,
    user_id     INT NOT NULL REFERENCES users(user_id),
    rating      INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (issue_id, user_id)
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
    INSERT INTO users (name, email, password, role, department_id, year)
    VALUES ('Rahul Sharma', 'rahul@campus.edu',
            '$2b$10$XMgwtk9bETwQwWUbva9KHeBbTH2mnvYlwQHN6hA/YaR1fJ2dbG7Ca',
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
             'Hostel Block C', 'SUBMITTED', 'HIGH', 7),

            (student_id, 3, 'Washrooms near canteen are dirty',
             'The washrooms adjacent to the main canteen have not been cleaned since Monday.',
             'Canteen Area', 'IN_PROGRESS', 'MEDIUM', 12),

            (student_id, 5, 'Wi-Fi not working in Library',
             'Internet connectivity has been down in the entire library building since morning.',
             'Library — Ground Floor', 'SUBMITTED', 'HIGH', 23),

            (student_id, 4, 'Broken bench in Computer Lab',
             'One of the benches in Lab 3 has a broken leg and is a safety hazard.',
             'Computer Lab — Lab 3', 'RESOLVED', 'LOW', 3),

            (student_id, 2, 'Water leakage in Block A corridor',
             'There is a continuous water drip from the ceiling in the Block A second floor corridor.',
             'Block A — 2nd Floor', 'SUBMITTED', 'CRITICAL', 18);
    END IF;
END $$;

SELECT 'Schema created successfully!' AS result;

-- -- INDEXES (Performance) ------------------------------------
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority);
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issues_department ON issues(department_id);
