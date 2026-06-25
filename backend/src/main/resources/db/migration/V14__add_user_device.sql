CREATE TABLE user_device (
    user_id     BIGINT,
    device_id   VARCHAR(100),
    profile     VARCHAR(10),
    PRIMARY KEY (user_id, device_id)
);