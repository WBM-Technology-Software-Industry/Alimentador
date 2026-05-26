CREATE TABLE feed_history (
    id          BIGSERIAL PRIMARY KEY,
    device_id   VARCHAR(50)  NOT NULL,
    timestamp   TIMESTAMPTZ  NOT NULL,
    grams       INTEGER,
    source      VARCHAR(20)  NOT NULL
);

CREATE TABLE device_telemetry (
    id          BIGSERIAL PRIMARY KEY,
    device_id   VARCHAR(50)  NOT NULL,
    timestamp   TIMESTAMPTZ  NOT NULL,
    eg          DOUBLE PRECISION,
    ep          DOUBLE PRECISION,
    cp          DOUBLE PRECISION,
    tp          DOUBLE PRECISION,
    er          INTEGER
);

CREATE TABLE device_schedule (
    id              BIGSERIAL PRIMARY KEY,
    device_id       VARCHAR(50)  NOT NULL,
    schedule_type   VARCHAR(20)  NOT NULL,
    schedule_data   TEXT,
    updated_at      TIMESTAMPTZ  NOT NULL,
    UNIQUE (device_id, schedule_type)
);

CREATE TABLE error_log (
    id              BIGSERIAL PRIMARY KEY,
    device_id       VARCHAR(50)  NOT NULL,
    timestamp       TIMESTAMPTZ  NOT NULL,
    error_code      INTEGER      NOT NULL,
    error_message   VARCHAR(255)
);

CREATE INDEX idx_feed_history_device_time   ON feed_history(device_id, timestamp DESC);
CREATE INDEX idx_telemetry_device_time      ON device_telemetry(device_id, timestamp DESC);
CREATE INDEX idx_error_log_device_time      ON error_log(device_id, timestamp DESC);
