-- Update sessions table to support both admin and regular users
-- First, we need to drop the existing foreign key constraint and recreate the table
-- SQLite doesn't support ALTER TABLE DROP CONSTRAINT, so we need to recreate the table

-- Create a new sessions table with the correct structure
CREATE TABLE sessions_new (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'user')),
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy existing data from the old sessions table (assuming all existing sessions are for admin users)
INSERT INTO sessions_new (id, user_id, user_type, expires_at, created_at)
SELECT id, user_id, 'admin', expires_at, created_at
FROM sessions;

-- Drop the old sessions table
DROP TABLE sessions;

-- Rename the new table to sessions
ALTER TABLE sessions_new RENAME TO sessions;

-- Create indexes for better query performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);