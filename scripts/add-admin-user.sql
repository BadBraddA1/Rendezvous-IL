-- Production SQL Script to Add Admin Users with Passwords
-- Run this in your Neon database console

-- IMPORTANT: This script adds users but you MUST set their passwords via the /admin/setup page
-- or by manually hashing passwords and updating the password_hash column

-- Method 1: Add admin user WITHOUT password (they must use /admin/setup to create password)
INSERT INTO admin_users (email, full_name, role)
VALUES ('stephen@bradd.us', 'Stephen R. Bradd', 'admin')
ON CONFLICT (email) DO UPDATE 
SET full_name = EXCLUDED.full_name, role = 'admin';

-- Method 2: If you already have a hashed password, use this format:
-- INSERT INTO admin_users (email, full_name, role, password_hash)
-- VALUES ('admin@example.com', 'Admin Name', 'admin', 'YOUR_HASHED_PASSWORD_HERE')
-- ON CONFLICT (email) DO UPDATE 
-- SET full_name = EXCLUDED.full_name, role = 'admin', password_hash = EXCLUDED.password_hash;

-- Add another admin (optional)
INSERT INTO admin_users (email, full_name, role)
VALUES ('adin@braddcorp.com', 'Adin', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Verify the admins were added
SELECT email, full_name, role, 
       CASE WHEN password_hash IS NOT NULL THEN 'Yes' ELSE 'No' END as has_password,
       created_at 
FROM admin_users 
ORDER BY created_at DESC;

-- Note: Users without password_hash must visit /admin/setup with ADMIN_SETUP_KEY to set their password
