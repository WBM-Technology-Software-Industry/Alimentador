-- Garante que a conta fique vinculada apenas ao ALIMENTADOR_3
DELETE FROM user_device
WHERE user_id = (SELECT id FROM app_user WHERE email = 'usuario@wbm.com')
  AND device_id <> 'ALIMENTADOR_3';

INSERT INTO user_device (user_id, device_id)
SELECT id, 'ALIMENTADOR_3' FROM app_user WHERE email = 'usuario@wbm.com'
ON CONFLICT (user_id, device_id) DO NOTHING;

INSERT INTO user_profile (user_id, profile)
SELECT id, 'pet' FROM app_user WHERE email = 'usuario@wbm.com'
ON CONFLICT (user_id, profile) DO NOTHING;

INSERT INTO user_profile (user_id, profile)
SELECT id, 'fish' FROM app_user WHERE email = 'usuario@wbm.com'
ON CONFLICT (user_id, profile) DO NOTHING;
