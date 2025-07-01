-- Add regular users table for form filling
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
);

-- Modify submissions table to link to user_id
ALTER TABLE submissions ADD COLUMN user_id INTEGER;
ALTER TABLE submissions ADD COLUMN user_type TEXT DEFAULT 'anonymous'; -- 'admin', 'user', or 'anonymous'

-- Create index for users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_submissions_user ON submissions(user_id, user_type);