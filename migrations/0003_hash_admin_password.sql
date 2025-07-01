-- Migration to update admin credentials for production
-- Admin: iplcmiami@gmail.com (bcrypt hash with salt rounds of 10)
-- Generated using bcrypt-edge's hashSync function

UPDATE admin_users
SET username = 'iplcmiami@gmail.com',
    password_hash = '$2a$10$i44JnasV6EpwEWiMurCeQ..Z5Pb814T21En5bmZnRUS4WA3juNqca'
WHERE username = 'admin';