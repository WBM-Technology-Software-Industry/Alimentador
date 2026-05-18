---
title: Comparativo de Plataformas — Hostinger vs Azure
subtitle: Dashboard WBM Technology
date: 31 de março de 2026
---

# Comparativo de Plataformas — Hostinger vs Azure

**Projeto:** Dashboard interno WBM Technology
**Data:** 31 de março de 2026
**Versão:** 2.0 — IoT como requisito de negócio

---

## 1. Contexto

Os produtos da WBM **dependem de IoT para funcionar**. Isso significa que a infraestrutura de IoT não é opcional — é parte do produto entregue ao cliente. Toda decisão de plataforma precisa considerar IoT como requisito central, não como evolução futura.

O dashboard WBM precisa de um servidor backend com três funções:

1. **Proxy OMIE** — intermediar chamadas entre o frontend e a API do OMIE (obrigatório: o OMIE bloqueia chamadas diretas do browser via CORS)
2. **Autenticação dos usuários** — controlar o acesso ao dashboard
3. **IoT** — receber, processar e armazenar dados dos sensores industriais dos produtos WBM

### Situação atual de custos

| Item | Quem paga | Custo |
|---|---|---|
| Hostinger (compartilhado Business) | **Desenvolvedor (pessoal)** | $16,99/mês |
| Firebase Hosting (frontend) | — | $0/mês |

**Problema:** a infraestrutura que sustenta o produto da empresa está sendo paga pelo desenvolvedor. Isso precisa ser corrigido — o custo de infraestrutura é responsabilidade da empresa.

---

## 2. Por que o Hostinger Compartilhado Atual Não Atende

O plano atual da Hostinger (hospedagem compartilhada Business) **não suporta IoT**:

| Requisito | Hostinger Compartilhado |
|---|---|
| Proxy OMIE | ✅ Funciona |
| MQTT broker para sensores | ❌ Impossível |
| Portas customizadas (1883, 8883) | ❌ Só HTTP/HTTPS |
| Docker | ❌ |
| Acesso root / instalação de software | ❌ |
| IP dedicado | ❌ |

O Hostinger compartilhado resolve o OMIE, mas é uma solução sem futuro para o caso da WBM.

---

## 3. As Opções

### Opção A — Hostinger VPS (KVM)

A Hostinger oferece servidores VPS com acesso root completo, Docker e IP dedicado. Suporta broker MQTT (Eclipse Mosquitto) com documentação oficial.

| Plano | CPU | RAM | SSD | Custo renovação |
|---|---|---|---|---|
| KVM 1 | 1 core | 4 GB | 50 GB | $11,99/mês |
| KVM 2 | 2 cores | 8 GB | 100 GB | $14,99/mês |

**O que roda no VPS Hostinger:**

| Serviço | Suporte |
|---|---|
| Proxy OMIE (Laravel ou Node.js) | ✅ |
| Broker MQTT (Mosquitto via Docker) | ✅ Documentado oficialmente |
| Gateway Modbus → MQTT | ✅ Qualquer software Linux |
| Banco de dados (MySQL, PostgreSQL) | ✅ |
| IP dedicado para os dispositivos IoT | ✅ |
| Escalabilidade | Limitada — servidor fixo |

**Limitação principal:** servidor único. Se o broker MQTT cair, os produtos dos clientes param de funcionar. Não tem redundância automática.

---

### Opção B — Microsoft Azure *(recomendado para IoT de negócio)*

Plataforma de nuvem com serviços dedicados para IoT industrial. Diferente de um VPS, o Azure IoT Hub é um serviço gerenciado — a Microsoft garante a disponibilidade, não você.

| Serviço Azure | Função | Free Tier |
|---|---|---|
| **Azure IoT Hub** | Recebe dados dos dispositivos IoT | 8.000 msg/dia grátis |
| **Azure Functions** | Proxy OMIE + processamento de eventos | 1.000.000 exec/mês grátis |
| **Azure IoT Central** | Dashboard IoT pronto | 2 dispositivos grátis |
| **Azure Stream Analytics** | Alertas e análise em tempo real | — |
| **Azure Storage** | Histórico dos dados dos sensores | ~$0,02/mês |

**Custo estimado para fase inicial:**

| Serviço | Uso | Custo |
|---|---|---|
| IoT Hub (Free tier) | até 8.000 msg/dia | $0/mês |
| Azure Functions | ~15.000 exec/mês | $0/mês |
| Storage | < 1 GB | ~$0,02/mês |
| **Total** | | **< $1/mês** |

Ao crescer (mais dispositivos, mais mensagens), o custo escala gradualmente conforme o uso real — sem pagar por capacidade ociosa.

---

## 4. Modbus no Azure — O que Saber

O Azure IoT Hub **não fala Modbus nativamente** — suporta apenas MQTT, AMQP e HTTPS. O módulo oficial da Microsoft para Modbus foi **arquivado em outubro de 2023** e não recebe mais suporte.

### Arquitetura necessária para sensores Modbus

```
Sensor Modbus TCP (porta 502)
          |
          v
   Gateway de protocolo
   converte: Modbus → MQTT
   (software rodando localmente)
          |
          v
   Azure IoT Hub (MQTT)
```

### Opções de gateway Modbus → MQTT

| Gateway | Tipo | Custo |
|---|---|---|
| HiveMQ Edge | Software, instala no servidor local | Gratuito (community) |
| ESP32 com firmware customizado | Microcontrolador | ~R$ 50 por unidade |
| Raspberry Pi | Mini-computador local | ~R$ 300 por unidade |
| Conversores industriais | Hardware dedicado | R$ 500–3.000 por unidade |

### Recomendação da Microsoft

Para novos projetos, a Microsoft recomenda o protocolo **OPC-UA** em vez de Modbus. Se os sensores ainda estão sendo especificados, optar por equipamentos com MQTT ou OPC-UA nativos elimina a necessidade do gateway e simplifica toda a arquitetura.

---

## 5. Comparativo Direto

| Critério | Hostinger Compartilhado (atual) | Hostinger VPS KVM 1 | **Azure** |
|---|---|---|---|
| Proxy OMIE | ✅ | ✅ | ✅ |
| MQTT broker para IoT | ❌ | ✅ | ✅ |
| Modbus gateway | ❌ | ✅ | ❌ (precisa gateway externo) |
| IP dedicado | ❌ | ✅ | ✅ |
| Docker | ❌ | ✅ | ✅ |
| Redundância / alta disponibilidade | ❌ | ❌ | ✅ |
| Escalabilidade automática | ❌ | ❌ | ✅ |
| Alertas IoT em tempo real | ❌ | Manual | ✅ Stream Analytics |
| Histórico de dados dos sensores | ❌ | Manual | ✅ Azure Storage |
| Custo mensal | $16,99 (bolso dev) | $11,99 (bolso dev) | **< $1 (empresa paga)** |
| Quem deve pagar | Empresa | Empresa | **Empresa** |
| Complexidade de configuração | Baixa | Média | Média/Alta |

---

## 6. Recomendação

### IoT é produto — infraestrutura é custo da empresa

Se os produtos da WBM dependem de IoT para funcionar, a infraestrutura que sustenta isso **é um custo de negócio**, não custo do desenvolvedor. O primeiro passo é corrigir isso.

### Recomendação: Microsoft Azure

| Motivo | Detalhe |
|---|---|
| IoT é o core do negócio | Azure IoT Hub é serviço gerenciado — a Microsoft garante a disponibilidade |
| Custo < $1/mês | Dentro do free tier para o volume inicial |
| Escala conforme os clientes crescem | Sem trocar de plataforma |
| Empresa assume o custo | Cartão de crédito da empresa no cadastro Azure |
| Proxy OMIE incluído | Azure Functions substitui o Hostinger |

### O que fazer com o Hostinger atual

Ao migrar para Azure, o Hostinger compartilhado pode ser **cancelado** — o Azure Functions assume o proxy OMIE sem custo adicional.

---

## 7. Arquitetura Recomendada

```
+---------------------+     +---------------------+
| Produtos WBM        |     | Usuarios (browser)   |
| (sensores IoT)      |     +----------+----------+
| MQTT / OPC-UA       |                |
+----------+----------+                |
           |                           |
           | MQTT/AMQP                 |
           v                           v
+----------+----------+   +-----------+----------+
| Azure IoT Hub       |   | Firebase Hosting      |
| (recebe sensores)   |   | Dashboard Next.js     |
+----------+----------+   +-----------+----------+
           |                           |
           v                           v
+----------+---------------------------+----------+
|               Azure Functions                    |
|  • Proxy OMIE (pedidos, clientes, estoque)       |
|  • Processar eventos dos sensores IoT            |
|  • Autenticacao dos usuarios                     |
+----------+---------------------------+----------+
           |                    |
           v                    v
+----------+-------+  +---------+---------+
|    OMIE API      |  | Azure Storage      |
| (dados negocio)  |  | (historico IoT)    |
+------------------+  +-------------------+
```

---

## 8. Próximos Passos

| Prioridade | Ação | Responsável |
|---|---|---|
| 1 | Empresa cria conta Microsoft Azure com cartão da empresa | WBM |
| 2 | Definir protocolo dos sensores (Modbus TCP, MQTT, OPC-UA?) | WBM + Dev |
| 3 | Migrar proxy OMIE do Hostinger para Azure Functions | Dev |
| 4 | Configurar Azure IoT Hub para receber dados dos sensores | Dev |
| 5 | Cancelar Hostinger compartilhado | WBM / Dev |
| 6 | Integrar dados IoT no dashboard | Dev |

---

*Documento gerado em 31/03/2026 — Dashboard WBM Technology*
*Versão 2.0 — IoT como requisito de negócio*
