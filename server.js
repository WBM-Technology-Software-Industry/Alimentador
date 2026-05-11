// Servidor unificado para Hostinger
// Serve o React + proxy MQTT WebSocket na mesma porta

import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import net from 'net'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PORT        = process.env.PORT || 3000
const BROKER_HOST = '152.67.43.175'
const BROKER_PORT = 1883

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
}

const server = createServer((req, res) => {
  let filePath = join(__dirname, 'dist', req.url === '/' ? 'index.html' : req.url)
  if (!existsSync(filePath)) filePath = join(__dirname, 'dist', 'index.html')

  const mime = MIME[extname(filePath)] ?? 'application/octet-stream'
  try {
    res.writeHead(200, { 'Content-Type': mime })
    res.end(readFileSync(filePath))
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  const tcp = net.connect(BROKER_PORT, BROKER_HOST)

  ws.on('message', (data) => { if (tcp.writable) tcp.write(data) })
  tcp.on('data',   (data) => { if (ws.readyState === ws.OPEN) ws.send(data) })

  ws.on('close',  () => tcp.destroy())
  ws.on('error',  () => tcp.destroy())
  tcp.on('close', () => ws.close())
  tcp.on('error', () => ws.close())
})

server.listen(PORT, () => {
  console.log(`Servidor na porta ${PORT}`)
  console.log(`Proxy MQTT → ${BROKER_HOST}:${BROKER_PORT}`)
})
