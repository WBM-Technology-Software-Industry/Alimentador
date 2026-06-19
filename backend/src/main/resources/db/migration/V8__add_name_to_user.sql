ALTER TABLE app_user ADD COLUMN IF NOT EXISTS name VARCHAR(255);

UPDATE app_user SET name = 'avantgarde' WHERE email = 'avantgarde@wbmtechnology.com';
