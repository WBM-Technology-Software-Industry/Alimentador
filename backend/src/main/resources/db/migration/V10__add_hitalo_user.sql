INSERT INTO app_user (email, password_hash, created_at)
VALUES ('hitalo@wbm.com', '$2b$12$fUh1xa5OYv6exeI7qFn.lepVjnGSoyiQBVRVZtDnwRShFamRKmhA.', NOW())
ON CONFLICT (email) DO NOTHING;

UPDATE app_user SET name = 'hitalo' WHERE email = 'hitalo@wbm.com';
