INSERT INTO app_user (email, password_hash, created_at)
VALUES ('vendas@wbmtechnology.com.br', '$2b$12$JL7qrZtp8o.M0lukwW3xQO8yMOOh62dDmZzxA4og0ewGeoBSOlKT.', NOW())
ON CONFLICT (email) DO NOTHING;

UPDATE app_user SET name = 'ronilton' WHERE email = 'vendas@wbmtechnology.com.br';
