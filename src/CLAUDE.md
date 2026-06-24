# Frontend — React + TypeScript + Vite

## Arquitetura

- **Roteamento**: HashRouter (`#/`) — necessário pois o server.js serve SPA
- **Estado global**: Zustand com `persist` (localStorage) em `store/deviceStore.ts` e `store/authStore.ts`
- **MQTT**: `mqtt/client.ts` — conexão WebSocket ao broker, publica comandos, recebe telemetria
- **API REST**: `api/client.ts` — todas as chamadas HTTP ao backend Spring Boot

## Stores principais

### `deviceStore.ts`
- `deviceId` — alimentador selecionado (`ALIMENTADOR_1` / `ALIMENTADOR_2`)
- `deviceNames` — nomes personalizados por device (sincronizados com DB via `/api/labels`)
- `pendingManual` — comando manual em andamento `{ cmdAt, grams, cooldownUntil, user, cancelled? }`
- `optimisticFeed` — entrada temporária no histórico enquanto o trato está acontecendo
- `deviceData[id]` — telemetria ao vivo: `al` (motor), `eg` (estoque g), `ep` (%), `pf` (perfil)

### `authStore.ts`
- `token`, `email`, `name` — vem do login; `name` é o nome real da conta (`app_user.name`)

## Fluxo de comando manual

1. Usuário clica "Dispensar" → `publishCmd(deviceId, { sim: grams })`
2. `pendingManual` é criado com `{ cmdAt, grams, cooldownUntil, user }`
3. Device responde com `al: true` → motor ligado
4. Se usuário clica "Parar" → `publishCmd(deviceId, { st: 0 })` → `pendingManual.cancelled = true`
5. Device para → `al: false` → detecta `isManualFeed`:
   - `source = cancelled` se `pending.cancelled`, senão `manual`
   - Chama `api.postFeedEntry(deviceId, grams, source)`

## Tipos importantes

```ts
type PendingManual = { cmdAt, grams, cooldownUntil, user?, cancelled? }
type CachedEntry   = { id, timestamp, grams, source, deviceId, userName?, userEmail? }
type ApiFeedEntry  = { id, deviceId, timestamp, grams, source, userEmail?, userName? }
// source: 'manual' | 'scheduled' | 'cancelled'
```

## Páginas

| Arquivo | Rota | Função |
|---------|------|--------|
| `Dashboard.tsx` | `/` | Visão geral, FeedButton, telemetria ao vivo |
| `Historico.tsx` | `/historico` | Feed history com filtros; polling 2s |
| `Configuracao.tsx` | `/configuracao` | Seletor de device, nome, agendamentos |
| `Configuracoes.tsx` | `/configuracoes` | Conta do usuário (read-only) |
| `Estoque.tsx` | `/estoque` | Gráfico de estoque |

## Regras de build

- `npm run build` — gera `dist/` (commitado no git)
- TypeScript `noUnusedLocals` ativo — funções não usadas devem ser `export`
- Tailwind com classe `brand-*` definida em `tailwind.config.js`
