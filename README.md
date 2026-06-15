<div align="center">

# AEO & SEO Radar 📡

**Dashboard full stack para monitoramento e auditoria de presença digital**

Analisa domínios, valida dados estruturados (schema markup), audita performance via Google PageSpeed Insights e gera recomendações automáticas com IA.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Hono](https://img.shields.io/badge/Hono-4-E36002?style=flat-square&logo=hono)](https://hono.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)

[![Deploy](https://img.shields.io/badge/deploy-Vercel-black?style=flat-square&logo=vercel)](https://aeo-seo-radar-web-z33g.vercel.app)
[![API](https://img.shields.io/badge/API-Railway-7B2FBE?style=flat-square&logo=railway)](https://aeo-seo-radarapi-production.up.railway.app/health)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

[🚀 Demo ao vivo](https://aeo-seo-radar-web-z33g.vercel.app) · [📡 API Health](https://aeo-seo-radarapi-production.up.railway.app/health)

</div>

---

## Sobre o Projeto

O **AEO & SEO Radar** é um dashboard full stack que permite auditar qualquer domínio em segundos. O sistema coleta dados de múltiplas fontes em paralelo, processa as informações e entrega um relatório completo com scores e recomendações geradas por IA — tudo em uma interface responsiva com suporte a modo claro/escuro.

O projeto foi desenvolvido como portfólio técnico, com foco em boas práticas de arquitetura, tipagem estrita e experiência do usuário.

---

## Funcionalidades

- 🔍 **Auditoria de domínios** — análise completa de SEO, AEO, Performance e Score Geral
- 🤖 **Recomendações via IA** — 5 sugestões práticas geradas pelo Groq (Llama 3.1)
- 📊 **Schema Markup (AEO)** — detecta JSON-LD, Open Graph e calcula score de Answer Engine Optimization
- ⚡ **PageSpeed Insights** — integração com a API oficial do Google
- 🔐 **Autenticação** — login com Google, GitHub e Magic Link (NextAuth v5)
- 👤 **Histórico por usuário** — cada conta vê apenas suas próprias auditorias
- 🌙 **Modo claro/escuro** — tema escuro por padrão, alternável pelo usuário
- 📱 **Responsivo** — interface adaptada para mobile e desktop
- ✨ **Animações** — transições suaves com Framer Motion

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                     Turborepo Monorepo                   │
├──────────────────────┬──────────────────────────────────┤
│   apps/web           │   apps/api                       │
│   Next.js 16         │   Hono + Node.js                 │
│   Vercel             │   Railway                        │
├──────────────────────┴──────────────────────────────────┤
│                   Neon (PostgreSQL 17)                   │
│         tabelas: audits · user · account · session       │
└─────────────────────────────────────────────────────────┘
```

**Fluxo de auditoria:**

```
POST /api/v1/audits
       │
       ├── PageSpeed Insights API  ─┐
       │                            ├── paralelo
       └── Schema Markup Analysis  ─┘
                    │
              Groq API (Llama 3.1)
                    │
              Salva no Neon
                    │
         Frontend polling a cada 5s
```

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Monorepo | Turborepo |
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4 |
| Estado | React Query (TanStack Query) |
| Animações | Framer Motion |
| Backend | Hono, Node.js 20 |
| ORM | Drizzle ORM |
| Banco | PostgreSQL 17 (Neon serverless) |
| Auth | NextAuth v5 + @auth/drizzle-adapter |
| IA | Groq API (llama-3.1-8b-instant) |
| SEO | Google PageSpeed Insights API |
| Linter | Biome |
| Testes | Vitest |
| CI/CD | GitHub Actions |
| Deploy Frontend | Vercel |
| Deploy Backend | Railway |

---

## Como Rodar Localmente

### Pré-requisitos

- Node.js 20+
- Docker Desktop
- Conta no [Groq](https://console.groq.com) (gratuito)
- Chave da [PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started)

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/Doug1980/aeo-seo-radar.git
cd aeo-seo-radar

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
# Preencha as variáveis nos arquivos criados

# 4. Sobe o banco de dados
docker-compose up postgres -d

# 5. Aplica as migrations
cd apps/api && npx drizzle-kit push
cd ../web && npx drizzle-kit push

# 6. Sobe o projeto
cd ../..
npm run dev
```

### Acesso

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| Health | http://localhost:3001/health |

---

## Variáveis de Ambiente

### `apps/api/.env`

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://...
PAGESPEED_API_KEY=...
GROQ_API_KEY=...
```

### `apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
DATABASE_URL=postgresql://...
AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
AUTH_RESEND_KEY=...
NEXTAUTH_URL=http://localhost:3000
```

---

## Deploy

O projeto está configurado para **deploy automático** a cada push na branch `main`:

- **Vercel** — frontend Next.js (zero config para monorepo)
- **Railway** — API Hono com build via `tsc`
- **Neon** — banco PostgreSQL serverless (free tier permanente)

---

## Destaques Técnicos

- **Monorepo com Turborepo** — compartilhamento de tipos TypeScript entre frontend e backend via `packages/shared`
- **Polling inteligente** — React Query faz polling a cada 5s e para automaticamente quando a auditoria conclui
- **Resiliência na auditoria** — cada fonte de dados (PageSpeed, Schema) tem `.catch` isolado, garantindo resultado parcial em vez de falha total
- **Lazy initialization do Neon** — conexão criada sob demanda para evitar erros de build no Vercel
- **Filtragem por usuário** — header `x-user-id` enviado pelo frontend e validado no backend para isolar históricos
- **Modo escuro como padrão** — `next-themes` com `defaultTheme: dark` e variante CSS customizada para Tailwind v4

---

## Autor

**Douglas Salazar**
- GitHub: [@Doug1980](https://github.com/Doug1980)
- Email: douglas.dev.salazar@gmail.com

---

## Licença

Este projeto está sob a licença [MIT](LICENSE).
