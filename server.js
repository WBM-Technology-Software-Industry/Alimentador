import { createServer } from 'http'
import http from 'http'
import https from 'https'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'

const __dirname   = fileURLToPath(new URL('.', import.meta.url))
const PORT        = Number(process.env.PORT || 3000)
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080'

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
}

function proxyRequest(req, res) {
  const target  = new URL(req.url, BACKEND_URL)
  const isHttps = target.protocol === 'https:'
  const proto   = isHttps ? https : http

  const chunks = []
  req.on('data', chunk => chunks.push(chunk))
  req.on('end', () => {
    const body = Buffer.concat(chunks)
    const options = {
      hostname: target.hostname,
      port:     target.port || (isHttps ? 443 : 80),
      path:     target.pathname + target.search,
      method:   req.method,
      headers:  { ...req.headers, host: target.host, 'content-length': body.length },
    }

    const proxy = proto.request(options, (backRes) => {
      res.writeHead(backRes.statusCode, backRes.headers)
      backRes.pipe(res)
    })

    proxy.on('error', () => {
      res.writeHead(502)
      res.end('Backend indisponível')
    })

    proxy.end(body)
  })
}

const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url ?? '/')

  if (url.startsWith('/api/')) {
    proxyRequest(req, res)
    return
  }

  let filePath = join(__dirname, 'dist', url === '/' ? 'index.html' : url)
  if (!existsSync(filePath)) filePath = join(__dirname, 'dist', 'index.html')

  const ext  = extname(filePath)
  const mime = MIME[ext] ?? 'application/octet-stream'
  const headers = { 'Content-Type': mime }
  if (ext === '.html') headers['Cache-Control'] = 'no-store'
  try {
    res.writeHead(200, headers)
    res.end(readFileSync(filePath))
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(PORT, () => {
  console.log(`Servidor na porta ${PORT}`)
  console.log(`Proxy API → ${BACKEND_URL}`)
})
