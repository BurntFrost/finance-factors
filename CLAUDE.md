# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the `next-dashboard/` directory:

```bash
# Core
npm run dev              # Dev server (Next.js + Turbopack on http://localhost:3000)
npm run build            # Production build
npm run lint             # ESLint
npm test                 # Jest tests
npm run test:watch       # Jest watch mode
npm run build:analyze    # Bundle analysis (ANALYZE=true)

# Database (requires DATABASE_URL)
npm run db:generate      # Prisma generate
npm run db:migrate       # Run Prisma migrations
npm run db:studio        # Open Prisma Studio

# Diagnostics & health checks
npm run test:apis        # Test all external API connections
npm run test:health      # Run health checks against local server
npm run test:health:production  # Health checks against production
npm run health:local     # Quick local health ping (requires running server)
npm run health:production # Quick production health ping
npm run dev:vercel       # Local dev via Vercel CLI (uses vercel env)
```

## Architecture

**Finance Factors Dashboard** is a Next.js 16 (App Router) + React 19 + TypeScript app that visualizes US economic and financial data (house prices, inflation, GDP, unemployment, interest rates, etc.) from multiple federal data sources.

### Project Layout

The main application lives in `next-dashboard/`. Key directories:

- **`app/`** — Next.js App Router pages and 18 API route directories
- **`lib/frontend/`** — React components, context providers (7), custom hooks, services
- **`lib/backend/`** — API services (FRED, BLS, Census, Alpha Vantage), caching, database, monitoring
- **`lib/shared/`** — Shared types and config (data sources, chart configuration)
- **`prisma/`** — Schema with 11 models (User, Dashboard, Cache, AuditLog, etc.)

### External APIs

- **FRED** (Federal Reserve Economic Data) — housing, GDP, rates, inflation
- **BLS** (Bureau of Labor Statistics) — employment, wages
- **Census Bureau** — demographics, income, housing
- **Alpha Vantage** (optional) — additional indicators
- **Anthropic** (optional) — AI-powered trend insights via `/api/insights` (Claude Haiku)

### Tech Stack

- **UI**: Radix UI + shadcn/ui, Tailwind CSS 4, Chart.js + react-chartjs-2, Lucide icons
- **Backend**: Next.js API routes, Prisma 6 (PostgreSQL), optional Redis caching, Apollo Server (GraphQL)
- **Build**: Turbopack (dev), webpack chunk splitting (prod), bundle analyzer
- **Testing**: Jest 30 + Testing Library (jsdom environment)

### Deployment

Vercel deployment via `.github/workflows/deploy.yml`. Health checks run against main page and API proxy after deploy. Preview deployments created on PRs.

### Data Flow & Gotchas

The live data pipeline has multiple layers of failover:

```
ParallelDashboard → useStandardDashboardData → AutomaticDataSourceContext.fetchData
  → attemptLiveDataWithFailover → provider chain (FRED → BLS → Census)
    → realApiService → proxyApiService → /api/proxy/data (server-side)
      → fredProxyService / blsProxyService (actual API calls)
```

- **Circuit breaker**: Frontend tracks API failures per provider. After repeated failures, it "opens" and skips that provider for a cooldown period. Check `/api/circuit-breaker/status`.
- **"Sample data" badge**: Appears when `response.metadata?.isFallback` is true. If live APIs are working but users still see it, the cause is usually stale `localStorage` — hard refresh fixes it.
- **CSS variables**: shadcn/ui stores raw HSL values (e.g., `0 0% 100%`) in `--background`/`--foreground`. Always wrap with `hsl()` when using in CSS: `background: hsl(var(--background))`.
- **Cron prefetch**: Runs daily at 6 AM UTC (`/api/cron/prefetch`). Cache keys must match the format in `/api/proxy/data` exactly (`api:${dataType}:undefined`).

## Quick Start

```bash
cd next-dashboard
cp .env.example .env.local    # Fill in at least FRED_API_KEY
npm install
npm run dev                    # http://localhost:3000
```

Minimum viable setup: just a FRED API key gets you ~80% of the data. BLS and Census are optional extras.

## Environment Variables

See `next-dashboard/.env.example` for all variables. Key ones:
- `NEXT_PUBLIC_FRED_API_KEY`, `NEXT_PUBLIC_BLS_API_KEY`, `NEXT_PUBLIC_CENSUS_API_KEY` — data source API keys
- `DATABASE_URL` / `DIRECT_URL` — PostgreSQL (optional)
- `ENABLE_REDIS` / `REDIS_URL` — Redis caching (optional, default: false)
- `ANTHROPIC_API_KEY` — AI trend insights (optional)
- `CRON_SECRET` — Auth token for Vercel cron jobs (required in production)

## Conventions

- Path aliases: `@/`, `@/frontend`, `@/backend`, `@/shared`, `@/components`, `@/lib`
- TypeScript strict mode
- ESLint flat config (eslint.config.mjs) extending eslint-config-next
- Frontend/backend code strictly separated under `lib/`
- Unused vars prefixed with `_`
