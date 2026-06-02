DELETE FROM auth_token;
DELETE FROM app_user;

INSERT INTO app_user (email, password_hash)
VALUES ('usuario@wbm.com', '$2b$10$xbDxyQciH0E3xvVmnbozbueT1hE69SEAA6Ff0qZuFZOBR/s3urHGW');
