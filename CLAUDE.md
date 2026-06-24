# ControlFeed — Alimentador Automático

Sistema de controle de alimentação automática para pets, desenvolvido pela WBM Technology.

## Stack

- **Frontend**: React + TypeScript + Vite → `src/`
- **Backend**: Spring Boot (Java) + PostgreSQL → `backend/`
- **MQTT**: broker externo; browser se conecta via WebSocket; `server.js` faz bridge WS↔TCP
- **Deploy**: Docker Compose em produção; `cd /projetos/feeder && git pull && docker compose up -d --build`
- **URL produção**: https://feeder.wbmtechnologylin.com.br/

## Regras gerais

- Nunca trabalhar em modo dev — somente produção
- Commits sem "Co-Authored-By: Claude"
- Após mudanças no backend, rodar `npm run build` no frontend antes do commit
- O `dist/` é versionado no git e servido pelo `server.js` (Node.js)

## Banco de dados

PostgreSQL no container `alimentador-postgres-1`, banco `feeder`, user `feeder`.

```bash
docker exec -it alimentador-postgres-1 psql -U feeder -d feeder
```

## Migrations Flyway (V1–V12)

| Versão | O que faz |
|--------|-----------|
| V1     | Schema inicial (feed_history, app_user, auth_token) |
| V5     | user_email em feed_history |
| V7     | device_last_seen |
| V8     | coluna name em app_user |
| V10    | usuário hitalo |
| V11    | user_name em feed_history |
| V12    | device_label (nomes personalizados dos alimentadores) |

## Dispositivos

- `ALIMENTADOR_1` e `ALIMENTADOR_2`
- Perfil padrão: `pf: 1` (cão/pet) — modo peixe preservado no código mas inativo na UI
