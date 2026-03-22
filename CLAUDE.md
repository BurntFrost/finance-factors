# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the `next-dashboard/` directory:

```bash
npm run dev              # Dev server (Next.js + Turbopack on http://localhost:3000)
npm run build            # Production build
npm run lint             # ESLint
npm test                 # Jest tests
npm run test:watch       # Jest watch mode
npm run build:analyze    # Bundle analysis (ANALYZE=true)
npm run db:generate      # Prisma generate
npm run db:migrate       # Run Prisma migrations
npm run db:studio        # Open Prisma Studio
```

## Architecture

**Finance Factors Dashboard** is a Next.js 16 (App Router) + React 19 + TypeScript app that visualizes US economic and financial data (house prices, inflation, GDP, unemployment, interest rates, etc.) from multiple federal data sources.

### Project Layout

The main application lives in `next-dashboard/`. Key directories:

- **`app/`** — Next.js App Router pages and 16 API route directories
- **`lib/frontend/`** — React components, context providers (7), custom hooks, services
- **`lib/backend/`** — API services (FRED, BLS, Census, Alpha Vantage), caching, database, monitoring
- **`lib/shared/`** — Shared types and config (data sources, chart configuration)
- **`prisma/`** — Schema with 11 models (User, Dashboard, Cache, AuditLog, etc.)

### External APIs

- **FRED** (Federal Reserve Economic Data) — housing, GDP, rates, inflation
- **BLS** (Bureau of Labor Statistics) — employment, wages
- **Census Bureau** — demographics, income, housing
- **Alpha Vantage** (optional) — additional indicators

### Tech Stack

- **UI**: Radix UI + shadcn/ui, Tailwind CSS 4, Chart.js + react-chartjs-2, Lucide icons
- **Backend**: Next.js API routes, Prisma 6 (PostgreSQL), optional Redis caching, Apollo Server (GraphQL)
- **Build**: Turbopack (dev), webpack chunk splitting (prod), bundle analyzer
- **Testing**: Jest 30 + Testing Library (jsdom environment)

### Deployment

Vercel deployment via `.github/workflows/deploy.yml`. Health checks run against main page and API proxy after deploy. Preview deployments created on PRs.

## Environment Variables

See `next-dashboard/.env.example` for all variables. Key ones:
- `NEXT_PUBLIC_FRED_API_KEY`, `NEXT_PUBLIC_BLS_API_KEY`, `NEXT_PUBLIC_CENSUS_API_KEY` — data source API keys
- `DATABASE_URL` / `DIRECT_URL` — PostgreSQL (optional)
- `ENABLE_REDIS` / `REDIS_URL` — Redis caching (optional, default: false)

## Conventions

- Path aliases: `@/`, `@/frontend`, `@/backend`, `@/shared`, `@/components`, `@/lib`
- TypeScript strict mode
- ESLint flat config (eslint.config.mjs) extending eslint-config-next
- Frontend/backend code strictly separated under `lib/`
- Unused vars prefixed with `_`
