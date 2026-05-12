# Relatório de Erros — Alimentador PWA

## Erros de Conectividade MQTT

### Mixed Content — WebSocket bloqueado em HTTPS

**Sintoma:** App hospedado em HTTPS não conseguia conectar ao broker MQTT. Erro no console: `Mixed Content: blocked`.  
**Causa:** URL do broker usava `ws://` (não seguro), incompatível com páginas HTTPS.  
**Correção:** App detecta o protocolo automaticamente e usa `wss://` em HTTPS via proxy `server.js` (WebSocket → TCP).

---

### Proxy WebSocket não encaminhava para o broker

**Sintoma:** Conexão WebSocket estabelecia com o servidor, mas o MQTT não chegava ao broker.  
**Causa:** `server.js` não estava rodando ou não estava fazendo ponte WebSocket → TCP na porta 1883.  
**Correção:** Servidor unificado (`server.js`) serve o React e faz proxy WebSocket → TCP para `152.67.43.175:1883` na mesma porta.

---

### `VITE_DEVICE_ID` vazio — app não assinava o tópico correto

**Sintoma:** App conectava ao broker mas não recebia telemetria. Nenhuma mensagem no tópico `devices/.../status`.  
**Causa:** Dockerfile sobrescrevia `VITE_DEVICE_ID` com valor vazio via `ARG`/`ENV`, ignorando o `.env`.  
**Correção:** Removidas as linhas `ARG VITE_DEVICE_ID` e `ENV VITE_DEVICE_ID=` do Dockerfile.

---

## Erros de Firmware / Dispositivo

### Comando de trato manual incorreto

**Sintoma:** App enviava `{ "st": 1 }` ou `{ "st": 1, "q": N }` mas o motor não respondia à quantidade especificada.  
**Causa:** O comando correto para trato manual com quantidade específica é `{ "sim": N }`. O `st` serve apenas para parar o motor (`{ "st": 0 }`).  
**Correção:** App agora envia `{ "sim": N }` onde N é a quantidade em gramas. O firmware calcula o tempo de motor automaticamente.

---

### Modo Manual voltava para Automático a cada telemetria

**Sintoma:** Ao trocar para Manual no app, o modo voltava para Automático automaticamente após receber qualquer mensagem do dispositivo.  
**Causa:** O campo `am: true` da telemetria sobrescrevia a seleção do usuário a cada mensagem recebida.  
**Correção:** Removido o `am` do `setTelemetry` em `client.ts` — o modo é controlado exclusivamente pelo usuário.

---

### `deviceType` voltava para Piscicultura ao receber telemetria

**Sintoma:** Ao usar o modo Pet, o app voltava automaticamente para Piscicultura após receber uma mensagem do dispositivo.  
**Causa:** Campo `pf: 0` da telemetria sobrescrevia o `deviceType` definido pelo usuário.  
**Correção:** Removido o override automático — `deviceType` é controlado exclusivamente pelo usuário na tela de Configuração.

---

## Códigos de Erro do Dispositivo (`er`)

| Código | Descrição | Causa provável |
|--------|-----------|----------------|
| `0` | Sem erro | — |
| `1` | Corrente zero | Motor desconectado ou fusível queimado |
| `2` | Corrente alta | Motor travado por objeto estranho ou ração úmida |
| `3` | Vazio | Sensor capacitivo detectou falta de ração |
| `6` | Quase vazio | Nível de ração baixo, próximo do fim |
| `11` | Timeout | Motor ligado por tempo excessivo sem atingir o peso |
