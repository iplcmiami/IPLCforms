-- Migration to update admin credentials for production
-- Admin: iplcmiami@gmail.com (legacy bcrypt hash - will be migrated to PBKDF2 on next login)
-- Hash format: bcrypt with salt rounds of 10

UPDATE admin_users
SET username = 'iplcmiami@gmail.com',
    password_hash = '$2a$10$wEhbjEWLL7LO1GLoy1QwzOAsAuZr0zK1NZ9KlBdd7AGOQ7Jv7VMhe'
WHERE username = 'admin';