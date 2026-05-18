# Dashboard WBM

Sistema de gestão interna da WBM Technology para controle de pedidos e ordens de produção.

## Tecnologias

| Tecnologia                                   | Versão | Uso                                             |
| -------------------------------------------- | ------ | ----------------------------------------------- |
| [Next.js](https://nextjs.org)                | 15     | Framework React (App Router + Turbopack)        |
| [React](https://react.dev)                   | 19     | UI                                              |
| [TypeScript](https://www.typescriptlang.org) | 5      | Tipagem estática                                |
| [Tailwind CSS](https://tailwindcss.com)      | 4      | Estilização (oklch color tokens)                |
| [shadcn/ui](https://ui.shadcn.com)           | —      | Componentes (estilo radix-nova)                 |
| [Radix UI](https://www.radix-ui.com)         | —      | Primitivos de acessibilidade                    |
| [Lucide React](https://lucide.dev)           | —      | Ícones                                          |
| [Firebase](https://firebase.google.com)      | 11     | Auth + Firestore (banco de dados em tempo real) |
| [date-fns](https://date-fns.org)             | —      | Manipulação de datas                            |

## Funcionalidades

- **Autenticação** — login via Firebase Auth
- **Pedidos** — CRUD completo com itens dinâmicos, prioridade, status e controle de prazos
- **Ordens de Produção** — gestão de OPs internas (vinculadas a pedidos) e externas (por empresa), com itens, responsável, setor e rastreamento de fabricação
- **Tempo real** — listeners Firestore (`onSnapshot`) mantêm os dados sincronizados sem recarregar a página

## Estrutura

```
app/
  login/          # Página de autenticação
  dashboard/
    data-provider.tsx   # Context global + CRUD Firebase
    layout.tsx          # Sidebar + layout do dashboard
    pedidos/            # Gestão de pedidos
    ops/                # Ordens de produção
components/
  app-sidebar.tsx       # Navegação lateral
  ui/                   # Componentes shadcn
lib/
  firebase.ts           # Configuração Firebase
  auth-context.tsx      # Contexto de autenticação
scripts/
  migrate-pedidos.ts    # Script de migração de dados
```

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse [http://localhost:8000](http://localhost:8000).
