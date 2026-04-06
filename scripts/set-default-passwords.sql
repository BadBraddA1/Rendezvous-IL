-- Set default password (12345678) for existing admin users
-- Password hash: 916f0027a575074ce72a331777c3478d6513f786a591bd892da1a577bf2335f9

UPDATE admin_users 
SET password_hash = '916f0027a575074ce72a331777c3478d6513f786a591bd892da1a577bf2335f9',
    must_change_password = true
WHERE email IN ('Adin@braddcorp.com', 'stephen@bradd.us');

-- Verify the update
SELECT email, role, must_change_password, created_at 
FROM admin_users 
ORDER BY created_at DESC;
