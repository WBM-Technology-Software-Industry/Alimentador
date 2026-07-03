// Ferramenta de dev p/ testar o broker MQTT sem depender do Postman.
//
// Uso:
//   node scripts/mqtt-check.mjs listen                          — assina devices/+/status e mostra tudo que chegar
//   node scripts/mqtt-check.mjs publish ALIMENTADOR_3 '{"sim":50}'  — publica um comando em devices/<id>/cmd
//
// Credenciais/URL via env (não hardcoded):
//   MQTT_BROKER_URL (padrão: ws://52.67.133.240:9001)
//   MQTT_USERNAME / MQTT_PASSWORD

import mqtt from 'mqtt'

const url      = process.env.MQTT_BROKER_URL || 'ws://52.67.133.240:9001'
const username = process.env.MQTT_USERNAME
const password = process.env.MQTT_PASSWORD

const [, , mode, arg1, arg2] = process.argv

if (!['listen', 'publish'].includes(mode)) {
  console.log('Uso: node scripts/mqtt-check.mjs listen')
  console.log('     node scripts/mqtt-check.mjs publish <deviceId> <jsonPayload>')
  process.exit(1)
}

console.log(`Conectando em ${url}${username ? ` (usuário: ${username})` : ' (sem credenciais — defina MQTT_USERNAME/MQTT_PASSWORD)'}...`)

const client = mqtt.connect(url, {
  connectTimeout: 8000,
  reconnectPeriod: 0,
  username,
  password,
})

client.on('error', (err) => {
  console.error('ERRO de conexão:', err.message)
  client.end(true)
  process.exit(1)
})

client.on('connect', () => {
  console.log('Conectado!')

  if (mode === 'listen') {
    client.subscribe('devices/+/status', { qos: 0 }, (err) => {
      if (err) { console.error('Erro ao inscrever:', err.message); process.exit(1) }
      console.log('Inscrito em devices/+/status — Ctrl+C para sair.\n')
    })
    client.on('message', (topic, payload) => {
      console.log(`[${new Date().toISOString()}] ${topic}  ${payload.toString()}`)
    })
    return
  }

  // publish
  if (!arg1 || !arg2) {
    console.log('Uso: node scripts/mqtt-check.mjs publish <deviceId> <jsonPayload>')
    client.end(true)
    process.exit(1)
  }
  const topic = `devices/${arg1}/cmd`
  client.publish(topic, arg2, { qos: 1 }, (err) => {
    if (err) console.error('Erro ao publicar:', err.message)
    else console.log(`Publicado em ${topic}: ${arg2}`)
    client.end(true)
    process.exit(err ? 1 : 0)
  })
})
