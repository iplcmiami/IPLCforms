-- Re-hash admin password with bcrypt-edge
UPDATE admin_users 
SET password_hash = '$2a$10$faNEh7cBTAACn5YnhUwCvePac2uNzL29vwS4Qol2TC5GQaBhMtyOK' 
WHERE email = 'iplcmiami@gmail.com';