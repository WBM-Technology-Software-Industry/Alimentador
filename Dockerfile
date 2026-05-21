# Estágio 1: build do frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Estágio 2: servidor de produção (só o necessário)
FROM node:20-alpine
WORKDIR /app
RUN npm install ws --no-save
COPY --from=builder /app/dist ./dist
COPY server.js ./
EXPOSE 3000
CMD ["node", "server.js"]
