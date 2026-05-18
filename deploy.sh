#!/bin/bash
set -e

echo "==> Atualizando código..."
git pull origin main

echo "==> Subindo containers..."
docker compose up -d --build

echo "==> Deploy concluído!"
docker compose ps
