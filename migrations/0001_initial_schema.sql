-- Database schema for IPLC Forms PDF Management System

-- Forms table - stores form templates
CREATE TABLE forms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    template_data TEXT NOT NULL, -- JSON string of pdfme template
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
);

-- Form submissions table - stores filled form data
CREATE TABLE submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_id INTEGER NOT NULL,
    form_data TEXT NOT NULL, -- JSON string of form field values
    pdf_url TEXT, -- URL to generated PDF
    ai_summary TEXT, -- AI-generated summary
    submitted_by TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending', -- pending, processed, printed
    FOREIGN KEY (form_id) REFERENCES forms(id)
);

-- Admin users table - for authentication
CREATE TABLE admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1
);

-- Session management
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES admin_users(id)
);

-- Indexes for better performance
CREATE INDEX idx_forms_active ON forms(is_active);
CREATE INDEX idx_submissions_form_id ON submissions(form_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);