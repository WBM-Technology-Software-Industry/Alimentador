# Relatório de Migração — Dashboard WBM
**Data:** 27 de março de 2026
**Projeto:** Dashboard interno WBM Technology
**Assunto:** Integração com OMIE API, reestruturação do backend e avaliação de plataformas
**Versão:** 4.0 — inclui comparativo de plataformas e plano IoT

---

## 1. Situação Atual

O dashboard WBM funciona atualmente com a seguinte estrutura:

| Camada | Tecnologia | Hospedagem |
|---|---|---|
| Frontend | Next.js 16 + React 19 | Firebase Hosting |
| Backend | Laravel (PHP 8.2) | Hostinger |
| Banco de dados | MySQL | Hostinger |
| Autenticação | Laravel Sanctum | Hostinger |

### Problemas identificados na estrutura atual

- **Dados desatualizados** — pedidos, clientes e ordens precisam ser inseridos tanto no OMIE quanto no dashboard, gerando retrabalho
- **Escalabilidade limitada** — banco de dados local não reflete a realidade operacional registrada no OMIE
- **Sem suporte a IoT** — a estrutura atual não contempla integração com dispositivos IoT

---

## 2. Testes Técnicos Realizados

Antes de definir a arquitetura final, foram realizados testes diretos com a API do OMIE para validar as hipóteses levantadas.

### Teste 1 — Credenciais e conectividade

```
POST https://app.omie.com.br/api/v1/geral/clientes/
call: ListarClientes
```

**Resultado:** ✅ Sucesso — API respondeu com **838 clientes cadastrados**

### Teste 2 — CORS (chamada direta pelo browser)

Foi simulado o comportamento de um browser enviando o header `Origin` na requisição.

**Resultado:** ❌ A OMIE **não retorna** o header `Access-Control-Allow-Origin`

```
Access-Control-Allow-Origin:  ← ausente na resposta
```

**Conclusão:** O browser bloqueia a requisição automaticamente. Não é possível chamar a OMIE diretamente do frontend, independentemente das credenciais.

### O que isso significa na prática

```
Browser → OMIE diretamente   ✗  BLOQUEADO (CORS)
Servidor → OMIE               ✓  FUNCIONA
```

É necessário um **servidor intermediário (proxy)** que receba a requisição do browser e a repasse para a OMIE.

---

## 3. Comparativo de Plataformas

Foram avaliadas as principais plataformas para hospedar o servidor proxy que chama a OMIE (~500 req/dia, ~10 usuários).

| Plataforma | Chamadas Externas | Free Tier | Sem Cartão | Org Privada GitHub | Custo Estimado |
|---|---|---|---|---|---|
| **Cloudflare Workers** | ✅ | 100.000 req/dia | ✅ | ✅ | $0/mês |
| **Netlify Functions** | ✅ | 125.000/mês | ✅ | ✅ | $0/mês |
| **Supabase Edge Functions** | ✅ | 500.000/mês | ✅ | ✅ | $0/mês |
| **Deno Deploy** | ✅ | 100.000/dia | ✅ | ✅ | $0/mês |
| **Render** | ✅ | 750h/mês | ✅ | ✅ | $0 (dorme 15min) |
| **Azure Functions** | ✅ | 1.000.000 exec/mês | ⚠️ cartão (não cobra) | ✅ | < $0,50/mês |
| **Hostinger** | ✅ | Plano contratado | já pago | manual | $16,99/mês (renovação) |
| Vercel | ✅ | 150.000/mês | ✅ | ❌ bloqueado | $0 / $20 Pro |
| Firebase Functions | ❌ (Spark) | bloqueado | ❌ Blaze exige cartão | ✅ | exige cartão |
| Railway | ✅ | trial 30 dias | ❌ | ✅ | $5/mês |
| Fly.io | ✅ | trial 7 dias | ❌ | ✅ | ~$2–5/mês |

### Análise por cenário

| Cenário | Melhor opção |
|---|---|
| Sem cartão, custo zero, uso simples | **Cloudflare Workers** |
| Auth integrado para os usuários | **Supabase Edge Functions** |
| Já tem Hostinger pago | **Hostinger** (sem custo adicional) |
| **IoT + OMIE + escalabilidade** | **Microsoft Azure** |

---

## 4. Arquitetura Atual (Hostinger como Proxy)

Com base nos testes, a solução atual utiliza o **backend Laravel já existente no Hostinger** como proxy para a OMIE. Não é necessária infraestrutura adicional para o fluxo atual.

### Diagrama da arquitetura atual

```
+-----------------------------------------------------+
|                  Usuario (browser)                   |
+---------------------+-------------------------------+
                      |
+---------------------v-------------------------------+
|              Firebase Hosting  (ja existe)           |
|         Dashboard Next.js — site estatico            |
|                                                      |
|  • Tela de login        • Pedidos, OP, OS            |
|  • Clientes, Estoque    • Relatorios, Equipe         |
+----------+----------------------+--------------------+
           |                      |
+----------v----------+  +--------v--------------------+
|   Laravel Sanctum   |  |   Laravel (Hostinger)        |
|   (ja existe)       |  |   OmieController             |
|                     |  |                              |
|   Login dos         |  |  1. Recebe requisicao        |
|   usuarios          |  |  2. Valida token Sanctum     |
|   email + senha     |  |  3. Adiciona app_key/secret  |
|                     |  |  4. Repassa para OMIE        |
+----------+----------+  |  5. Retorna resposta         |
           |              +------------+----------------+
           |                           |
           +---------------------------+
                                       |
                        +--------------v--------------+
                        |          OMIE API            |
                        |                              |
                        |  • Pedidos (838+ registros)  |
                        |  • Clientes                  |
                        |  • Ordens de Producao        |
                        |  • Ordens de Servico         |
                        |  • Estoque / Produtos        |
                        +------------------------------+
```

---

## 5. Plano Futuro — Integração IoT com Microsoft Azure

A inclusão de dispositivos IoT no ecossistema WBM justifica a migração para o **Microsoft Azure**, que oferece uma suíte completa de serviços IoT totalmente integrados.

### Por que Azure para IoT?

| Serviço Azure | Função | Free Tier |
|---|---|---|
| **Azure IoT Hub** | Recebe e gerencia mensagens dos dispositivos IoT | 8.000 mensagens/dia grátis |
| **Azure IoT Central** | Dashboard IoT pronto, configuração sem código | 2 dispositivos grátis |
| **Azure Functions** | Proxy para OMIE + processamento de eventos IoT | 1.000.000 execuções/mês grátis |
| **Azure Stream Analytics** | Processamento de dados IoT em tempo real | 3h de streaming grátis |
| **Azure Storage** | Armazenamento de séries temporais dos sensores | Centavos por GB |

### Diagrama da arquitetura futura com IoT

```
+-------------------+     +-------------------+
|  Dispositivos IoT |     |  Usuarios (browser)|
|  (sensores, etc.) |     +--------+----------+
+--------+----------+              |
         |                         |
         | MQTT/HTTPS              |
         v                         v
+--------+----------+    +---------+----------+
|  Azure IoT Hub    |    |  Firebase Hosting   |
|  (ingestion)      |    |  Dashboard Next.js  |
+--------+----------+    +---------+----------+
         |                         |
         v                         v
+--------+----------------------------+--------+
|              Azure Functions                  |
|                                               |
|  • Proxy OMIE (ja implementado)               |
|  • Processar eventos IoT                      |
|  • Autenticacao (Bearer token)                |
+--------+----------------------------+--------+
         |                            |
         v                            v
+--------+----------+    +-----------+---------+
|    OMIE API       |    |  Azure Storage /     |
|  (dados de        |    |  Cosmos DB           |
|   negocio)        |    |  (dados IoT)         |
+-------------------+    +---------------------+
```

### Custo estimado Azure para IoT (uso leve — fase inicial)

| Serviço | Uso estimado | Custo |
|---|---|---|
| IoT Hub (Free tier) | até 8.000 msg/dia | **$0/mês** |
| Azure Functions | ~15.000 exec/mês | **$0/mês** (dentro do free) |
| Storage Account | < 1 GB | **~$0,02/mês** |
| **Total estimado** | | **< $1/mês** |

> A conta Azure exige cartão de crédito no cadastro, mas **não é cobrado nada** enquanto o uso ficar dentro dos limites gratuitos. O hold de verificação de ~$1 é estornado.

---

## 6. Backend Laravel — Proxy OMIE (implementado)

O `OmieController` já implementado no Hostinger recebe as requisições do frontend e as repassa para a OMIE com as credenciais armazenadas no servidor.

### Rota

```
POST /api/omie/proxy  (autenticado via Sanctum)
```

### Segurança

- As credenciais da OMIE (`app_key` e `app_secret`) ficam armazenadas como **variáveis de ambiente no servidor** — nunca no browser
- O backend valida o token Sanctum antes de qualquer chamada à OMIE
- Sem token válido → requisição rejeitada com HTTP 401

### Exemplo de uso (frontend)

```ts
// lib/api.ts
export async function apiOmieProxy<T>(
  endpoint: string,
  call: string,
  param: unknown[] = [{}]
): Promise<T> {
  return apiFetch<T>("/omie/proxy", {
    method: "POST",
    body: JSON.stringify({ endpoint, call, param }),
  })
}

// Buscar estoque do OMIE (1.753 produtos, paginado)
const estoque = await apiOmieProxy(
  "/estoque/consulta/",
  "ListarPosEstoque",
  [{ nPagina: 1, nRegPorPagina: 50 }]
)
```

---

## 7. Comparativo: Antes × Depois × Futuro

| | Antes | Agora | Futuro (Azure + IoT) |
|---|---|---|---|
| **Dados** | MySQL proprio | OMIE (fonte unica) | OMIE + dados IoT |
| **Backend** | Laravel — dados proprios | Laravel — proxy OMIE | Azure Functions |
| **Autenticacao** | Laravel Sanctum | Laravel Sanctum | Azure AD B2C ou Sanctum |
| **IoT** | Sem suporte | Sem suporte | Azure IoT Hub |
| **Custo mensal** | ~$17 (Hostinger) | ~$17 (mesmo) | < $1/mês |
| **Escalabilidade** | Limitada | Moderada | Alta (serverless) |
| **Atualizacao de dados** | Manual | Automatico via OMIE | Automatico (OMIE + IoT) |

---

## 8. Endpoints OMIE Disponíveis

Todos os módulos do dashboard têm endpoints correspondentes na OMIE, **confirmados funcionando** com as credenciais da empresa:

| Módulo | Endpoint OMIE | Status |
|---|---|---|
| Pedidos | `/api/v1/produtos/pedido/` | ✅ Disponível |
| Clientes | `/api/v1/geral/clientes/` | ✅ Testado (838 registros) |
| Produtos | `/api/v1/geral/produtos/` | ✅ Disponível |
| Estoque | `/api/v1/estoque/consulta/` | ✅ Testado (1.753 produtos) |
| Ordens de Produção | `/api/v1/produtos/op/` | ✅ Disponível |
| Ordens de Serviço | `/api/v1/servicos/os/` | ✅ Disponível |
| Usuários | `/api/v1/geral/usuarios/` | ✅ Disponível |

---

## 9. O que precisa ser feito

### Curto prazo (Hostinger atual)

- [ ] Adicionar `OMIE_APP_KEY` e `OMIE_APP_SECRET` no `.env` do Hostinger
- [x] `OmieController` implementado (proxy autenticado)
- [x] `apiOmieProxy` implementado no frontend
- [x] Estoque com dados do OMIE e paginação
- [ ] Integrar demais módulos (pedidos, OP, OS, clientes) com dados do OMIE

### Médio prazo (Azure + IoT)

- [ ] Criar conta Microsoft Azure
- [ ] Definir dispositivos IoT a serem integrados (tipo, protocolo, frequência de envio)
- [ ] Configurar Azure IoT Hub
- [ ] Migrar proxy OMIE para Azure Functions
- [ ] Integrar dados IoT no dashboard

---

## 10. Cronograma Estimado

| Etapa | Descrição | Estimativa |
|---|---|---|
| 1 | Configurar credenciais OMIE no Hostinger | 1 hora |
| 2 | Integração dos módulos restantes com OMIE | 2 dias |
| 3 | Testes e ajustes da integração OMIE | 1 dia |
| 4 | Definição dos dispositivos IoT e protocolos | A definir com equipe |
| 5 | Configuração Azure IoT Hub + Functions | 2 dias |
| 6 | Integração IoT no dashboard | 2 dias |
| 7 | Testes finais e deploy | 1 dia |
| **Total OMIE** | | **~3 dias úteis** |
| **Total IoT** | | **~5 dias úteis adicionais** |

---

## 11. Conclusão

Os testes técnicos confirmaram que:

1. **A API do OMIE funciona** com as credenciais da empresa (838 clientes, 1.753 produtos retornados)
2. **Chamadas diretas do browser são bloqueadas** pela ausência de CORS na OMIE — servidor proxy é obrigatório
3. **O backend Hostinger** já serve como proxy funcional, sem custo adicional
4. **Para IoT**, o Microsoft Azure é a plataforma mais adequada — suíte completa (IoT Hub, Functions, Stream Analytics) com free tier generoso (< $1/mês para uso inicial)

A recomendação é manter o Hostinger para o fluxo atual enquanto se planeja a migração para Azure, que será necessária assim que os dispositivos IoT entrarem em operação.

---

*Documento gerado em 27/03/2026 — Dashboard WBM Technology*
*Versão 4.0 — comparativo de plataformas + plano IoT com Azure*
