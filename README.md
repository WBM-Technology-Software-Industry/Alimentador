# WBM Dashboard

Monorepo com frontend (Next.js) e backend (Spring Boot).

## Estrutura

```
frontend/          → Next.js 15 (app router, standalone)
backend/           → Spring Boot 3 + PostgreSQL
nginx/nginx.conf   → Reverse proxy + SSL
docker-compose.yml → Orquestração de containers
deploy.sh          → Script de deploy (git pull + docker compose up)
```

## Deploy inicial na VPS

```bash
# 1. Clone o repositório
git clone git@github.com:WBM-Technology-Software-Industry/Alimentador.git
cd Alimentador

# 2. Configure as variáveis de ambiente
cp .env.example .env
nano .env   # preencha todas as variáveis

# 3. Obtenha o certificado SSL (antes de subir o nginx com HTTPS)
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d dashboard.wbmtechnologysoftware.com.br \
  --email seu-email@dominio.com --agree-tos --no-eff-email

# 4. Suba todos os serviços
docker compose up -d --build
```

## Deploy de atualização

```bash
chmod +x deploy.sh
./deploy.sh
```

## Serviços

| Serviço    | Porta interna | Descrição               |
|------------|---------------|-------------------------|
| postgres   | 5432          | Banco de dados          |
| backend    | 8080          | API Spring Boot         |
| frontend   | 3000          | Next.js standalone      |
| nginx      | 80, 443       | Reverse proxy + SSL     |
| certbot    | —             | Renovação automática SSL|
