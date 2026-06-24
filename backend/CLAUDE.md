# Backend — Spring Boot + PostgreSQL

## Stack

- Java 21, Spring Boot 3, Spring Data JPA, Flyway
- PostgreSQL 16 (container `alimentador-postgres-1`, banco `feeder`, user `feeder`)
- Autenticação: token Bearer em tabela `auth_token` (sem JWT, sem Spring Security filter chain)

## Estrutura de pacotes

```
com.wbm.feeder
├── config/
│   └── AuthFilter.java       — filtra rotas protegidas; adiciona CORS em toda resposta
├── controller/
│   ├── AuthController.java   — POST /api/auth/login|logout|validate
│   ├── DeviceController.java — GET|POST /api/devices/{id}/history|telemetry|errors|last-seen
│   └── DeviceLabelController.java — GET|PUT /api/labels (nomes personalizados)
├── model/
│   ├── AppUser.java          — id, email, passwordHash, name, createdAt
│   ├── FeedHistory.java      — id, deviceId, timestamp, grams, source, userEmail, userName
│   └── DeviceLastSeen.java
├── dto/
│   └── FeedHistoryDto.java   — record com from(FeedHistory)
├── repository/               — JPA repositories
└── service/
    └── FeedHistoryService.java — saveIfNew() para agendamentos (evita duplicatas 2min)
```

## Autenticação

- `AuthFilter` verifica Bearer token em todas as rotas exceto `/api/auth/**`
- `DeviceController.addHistory` resolve `userName` e `userEmail` do token via JDBC:
  ```sql
  SELECT u.name, u.email FROM auth_token t JOIN app_user u ON u.id = t.user_id WHERE t.token = ?
  ```
- Login retorna `{ token, email, name }` — `name` vem de `app_user.name`

## Tabelas principais

```sql
app_user      (id, email, password_hash, name, created_at)
auth_token    (token PK, user_id FK, created_at)
feed_history  (id, device_id, timestamp, grams, source, user_email, user_name)
device_label  (device_id PK, label)         -- nomes personalizados
device_last_seen (device_id PK, last_seen)
```

## Campo `source` em feed_history

| Valor | Significado |
|-------|-------------|
| `manual` | Trato manual concluído |
| `scheduled` | Agendamento automático (user_name = 'Sistema') |
| `cancelled` | Trato manual cancelado pelo usuário |

## Migrations Flyway

Ficam em `src/main/resources/db/migration/V{N}__descricao.sql`.
Próxima versão a usar: **V13**.

## CORS

Configurado no `AuthFilter` para todas as rotas:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```
OPTIONS retorna 200 imediatamente.

## Deduplicação de histórico

`FeedHistoryService.saveIfNew()` verifica se já existe registro com mesmo `deviceId + grams + source` nos últimos 2 minutos — evita múltiplos browsers postando o mesmo trato.
