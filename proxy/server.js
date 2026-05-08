// Proxy WebSocket → TCP MQTT
// O browser só fala WebSocket; o broker só fala TCP.
// Este proxy faz o túnel entre os dois sem precisar entender o protocolo MQTT.

import net from 'net'
import { WebSocketServer } from 'ws'

const WS_PORT    = 9001
const BROKER_HOST = '152.67.43.175'
const BROKER_PORT = 1883

const wss = new WebSocketServer({ port: WS_PORT })

wss.on('connection', (ws) => {
  const tcp = net.connect(BROKER_PORT, BROKER_HOST)

  ws.on('message', (data) => {
    if (tcp.writable) tcp.write(data)
  })

  tcp.on('data', (data) => {
    if (ws.readyState === ws.OPEN) ws.send(data)
  })

  ws.on('close',  () => tcp.destroy())
  ws.on('error',  () => tcp.destroy())
  tcp.on('close', () => ws.close())
  tcp.on('error', () => ws.close())
})

console.log(`MQTT WebSocket proxy rodando em ws://localhost:${WS_PORT}`)
console.log(`Encaminhando para mqtt://${BROKER_HOST}:${BROKER_PORT}`)
