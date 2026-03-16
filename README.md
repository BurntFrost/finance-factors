# Finance Factors Dashboard

Next.js dashboard for real-time US economic and financial data—FRED, BLS, Census, Alpha Vantage—with interactive charts, optional PostgreSQL/GraphQL/WebSocket, and Redis caching.

**Live:** [finance-factors.vercel.app](https://finance-factors.vercel.app) · **API health:** [api/proxy/health](https://finance-factors.vercel.app/api/proxy/health)

---

## Quick start

```bash
git clone https://github.com/BurntFrost/finance-factors.git
cd finance-factors/next-dashboard
npm install
npm run dev
```

Open **http://localhost:3000**. Works without API keys (uses historical sample data). For live data, add keys to `.env.local` (see [Environment](#environment)).

---

## Data sources

| Source | Data | Key |
|--------|------|-----|
| **FRED** | Housing, GDP, rates, inflation | [Get key](https://fred.stlouisfed.org/docs/api/api_key.html) |
| **BLS** | Employment, wages, labor stats | [Get key](https://www.bls.gov/developers/api_signature_v2.htm) |
| **Census** | Demographics, income, housing | [Get key](https://api.census.gov/data/key_signup.html) |
| **Alpha Vantage** | Extra indicators (optional) | [Get key](https://www.alphavantage.co/support/#api-key) |

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run test` | Jest |
| `npm run test:apis` | Test API connectivity |
| `npm run test:health` | Health checks |
| `npm run db:generate` | Prisma generate |
| `npm run db:migrate` | Prisma migrations |
| `npm run db:studio` | Prisma Studio |
| `npm run build:analyze` | Bundle analysis |

---

## Tech stack

- **App:** Next.js 16, React 19, TypeScript
- **UI:** Tailwind CSS, Radix/shadcn-style components, Chart.js
- **Data:** API proxy (FRED, BLS, Census, Alpha Vantage), optional Redis cache, optional PostgreSQL + Prisma, GraphQL (Apollo), WebSocket

---

## Project structure

```
next-dashboard/
├── app/                    # Next.js App Router (routes, layout, page)
│   ├── api/                # API routes, proxy, GraphQL, health
│   └── ...
├── lib/
│   ├── frontend/           # Components, context, hooks
│   ├── backend/            # Services, Redis, DB, monitoring
│   └── shared/             # Types, utils, config
├── package.json
├── next.config.ts
└── ...
```

---

## Environment

Copy `.env.example` to `.env.local`. Optional keys (app works with sample data without them):

```bash
# Live data (optional)
NEXT_PUBLIC_FRED_API_KEY=...
NEXT_PUBLIC_BLS_API_KEY=...
NEXT_PUBLIC_CENSUS_API_KEY=...
NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=...

# Optional: DB, Redis
DATABASE_URL="postgresql://..."
REDIS_URL="redis://localhost:6379"
```

---

## Deployment

- **Push to `main`** → GitHub Actions deploys to Vercel.
- **PRs** → Preview deployments.
- [Actions](https://github.com/BurntFrost/finance-factors/actions) · [Vercel](https://vercel.com/dashboard)

---

## Contributing

1. Fork, branch (`feature/...`), make changes.
2. `npm run lint` and `npm run test:apis` (and tests as needed).
3. Open a PR (conventional commits preferred: `feat:`, `fix:`, `docs:`).

---

## License

MIT — see [LICENSE](LICENSE).
