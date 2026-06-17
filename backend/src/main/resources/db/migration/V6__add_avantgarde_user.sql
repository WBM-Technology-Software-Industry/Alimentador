INSERT INTO app_user (email, password_hash, created_at)
VALUES ('avantgarde@wbmtechnology.com', '$2b$12$Dn/ZCg7wxnP2tUa8tvVM4u0E7VjD2TX7ikmzRcTmM0zhcfv3z77Ze', NOW())
ON CONFLICT (email) DO NOTHING;
