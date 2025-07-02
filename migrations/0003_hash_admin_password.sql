-- Migration to update admin credentials for production
-- Admin: iplcmiami@gmail.com (bcryptjs hash - compatible with edge runtime)
-- Hash format: bcryptjs with salt rounds of 10

UPDATE admin_users
SET username = 'iplcmiami@gmail.com',
    password_hash = '$2a$10$verQjtm3CQs07fQzc1ilG.2fwrvUh/EsqFLzIClQULmbYqfr5kugW'
WHERE username = 'admin';