-- Migration to update admin password from plain text to bcrypt hash
-- The hash below is for password 'demo123' with salt rounds of 10
-- Generated using bcrypt-edge's hashSync function

UPDATE admin_users 
SET password_hash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'
WHERE username = 'admin';