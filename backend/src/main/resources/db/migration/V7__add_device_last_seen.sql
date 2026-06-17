CREATE TABLE device_last_seen (
    device_id VARCHAR(100) PRIMARY KEY,
    last_seen  TIMESTAMPTZ NOT NULL
);
