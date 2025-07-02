-- Migration to add production user accounts
-- All users use a shared password (bcrypt hash with salt rounds of 10)
-- Generated using bcrypt-edge's hashSync function

INSERT INTO admin_users (username, password_hash, is_active) VALUES
('aquin217@fiu.edu', '$2a$10$.vUTB6zPa1o1agekwkteIeg1pZH4urw.sriVQALkzF4CmLjggQL4.', 1),
('Bammservices@yahoo.com', '$2a$10$.vUTB6zPa1o1agekwkteIeg1pZH4urw.sriVQALkzF4CmLjggQL4.', 1),
('giannaiesposito@gmail.com', '$2a$10$.vUTB6zPa1o1agekwkteIeg1pZH4urw.sriVQALkzF4CmLjggQL4.', 1),
('iguerra.ots@gmail.com', '$2a$10$.vUTB6zPa1o1agekwkteIeg1pZH4urw.sriVQALkzF4CmLjggQL4.', 1),
('IsaAreces1@gmail.com', '$2a$10$.vUTB6zPa1o1agekwkteIeg1pZH4urw.sriVQALkzF4CmLjggQL4.', 1),
('Karinadelarosa914@gmail.com', '$2a$10$.vUTB6zPa1o1agekwkteIeg1pZH4urw.sriVQALkzF4CmLjggQL4.', 1),
('adarley23@gmail.com', '$2a$10$.vUTB6zPa1o1agekwkteIeg1pZH4urw.sriVQALkzF4CmLjggQL4.', 1),
('Nancyc731@icloud.com', '$2a$10$.vUTB6zPa1o1agekwkteIeg1pZH4urw.sriVQALkzF4CmLjggQL4.', 1);

-- User Details Reference:
-- aquin217@fiu.edu - Student- Part Time, SLP
-- Bammservices@yahoo.com - Maggy Del Valle, OT  
-- giannaiesposito@gmail.com - Gianna Esposito, SLP
-- iguerra.ots@gmail.com - Isabel Guerra, OT
-- IsaAreces1@gmail.com - Isabelle Areces, SLP
-- Karinadelarosa914@gmail.com - Karina De La Rosa, SLP
-- adarley23@gmail.com - Alissa M Darley, SLP / Owner / Admin
-- Nancyc731@icloud.com - Nancy Beato, OT