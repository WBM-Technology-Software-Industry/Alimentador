#!/bin/bash
set -e

echo "==> Atualizando código..."
git pull origin main

echo "==> Buildando backend..."
cd backend
mvn -q package -DskipTests
cd ..

echo "==> Buildando frontend..."
cd frontend
npm ci --silent
npm run build
cd ..

echo "==> Reiniciando serviços..."
systemctl restart dashboard-api
systemctl restart dashboard-frontend

echo "==> Deploy concluído!"
systemctl status dashboard-api --no-pager -l | tail -5
systemctl status dashboard-frontend --no-pager -l | tail -5
