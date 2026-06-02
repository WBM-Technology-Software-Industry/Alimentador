CREATE TABLE app_user (
    id            BIGSERIAL    PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Initial user: user@gmail.com / admin123 (bcrypt)
INSERT INTO app_user (email, password_hash)
VALUES ('user@gmail.com', '$2b$10$bLOV7WOEr65srnZNdrF4mujxEyOfKhdcmUoLqHUDjabQjrHlTIpUa');

CREATE TABLE auth_token (
    token      VARCHAR(64)  PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
