# Finance Factors Dashboard

**See how the economy and costs that affect you change over time.**

A simple dashboard of US economic and financial data—house prices, income, inflation, interest rates, unemployment, GDP, money supply, and more—with interactive charts. No finance background needed.

**Try it:** [finance-factors.vercel.app](https://finance-factors.vercel.app)

---

## Contents

- [What you can do](#what-you-can-do)
- [How to use it](#how-to-use-it)
- [How the data works](#how-the-data-works)
- [Tech stack](#tech-stack)
- [For developers](#for-developers)

---

## What you can do

- **Browse charts** — Scroll through house prices, inflation, Fed rates, unemployment, GDP growth, treasury yields, and other key indicators.
- **Understand at a glance** — Each chart, table, and summary card has a short “what it means” line so you can interpret the numbers without jargon.
- **Hover for values** — Crosshair on charts shows exact values as you move the cursor.
- **Zoom and pan** — Use the 🔍 and ✋ controls on a chart, or Ctrl+scroll / pinch and drag on a trackpad.
- **Add more charts** — Use **Add element** in the top bar to add extra series or data types.
- **Choose your data** — Toggle between **sample data** (works immediately, no setup) and **up-to-date data** from government and public sources (optional; see [How the data works](#how-the-data-works)).
- **Faster loading** — Turn on **Faster loading** to load all charts at once instead of one after another.
- **Dark mode** — Use the theme toggle in the header for a dark layout.

---

## How to use it

### Use the live site

Go to [finance-factors.vercel.app](https://finance-factors.vercel.app). Everything works with sample data; no sign-up or API keys.

### Run it locally

From the repo root:

```bash
git clone https://github.com/BurntFrost/finance-factors.git
cd finance-factors/next-dashboard
npm install
npm run dev
```

Open **http://localhost:3000**. The app works without any API keys (sample data). For live data, add keys to `.env.local` as in [How the data works](#how-the-data-works).

---

## How the data works

- **Sample data (default)** — The app ships with example data so you can explore all charts and features right away. No configuration.
- **Up-to-date data (optional)** — For recent numbers from official sources, add free API keys. The app pulls from:
  - **FRED** — Housing, GDP, rates, inflation
  - **BLS** — Employment, wages, labor stats
  - **Census** — Demographics, income, housing
  - **Alpha Vantage** — Extra indicators (optional)

**Setup:** Copy `next-dashboard/.env.example` to `next-dashboard/.env.local` and add your own keys (do not commit `.env.local`):

```bash
cd next-dashboard
cp .env.example .env.local
# Edit .env.local and set:
# NEXT_PUBLIC_FRED_API_KEY=...
# NEXT_PUBLIC_BLS_API_KEY=...
# NEXT_PUBLIC_CENSUS_API_KEY=...
# NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=...   # optional
```

**Get keys:** [FRED](https://fred.stlouisfed.org/docs/api/api_key.html) · [BLS](https://www.bls.gov/developers/api_signature_v2.htm) · [Census](https://api.census.gov/data/key_signup.html) · [Alpha Vantage](https://www.alphavantage.co/support/#api-key)

---

## Tech stack

- **Next.js 16** (App Router, Turbopack in dev) · **React 19**
- **Chart.js** (react-chartjs-2) with zoom and crosshair plugins
- **Tailwind CSS** · **Radix UI** · **Lucide** icons
- **Optional:** PostgreSQL (Prisma), Redis (caching), GraphQL (Apollo) — see `next-dashboard/.env.example`

---

## For developers

All commands below are run from **`next-dashboard/`**.

| Command | Description |
|--------|-------------|
| `npm run dev` | Dev server (Turbopack) at http://localhost:3000 |
| `npm run build` | Production build |
| `npm run build:analyze` | Build with bundle analysis |
| `npm run start` | Run production build locally |
| `npm run lint` | ESLint |
| `npm run test` | Jest |
| `npm run test:watch` | Jest watch mode |
| `npm run test:apis` | Test external API connectivity |
| `npm run test:health` | Run health-check script |
| `npm run db:generate` | Prisma generate |
| `npm run db:migrate` | Prisma migrations |
| `npm run db:studio` | Prisma Studio |

**Deploy:** Push to `main` → GitHub Actions deploys to Vercel. PRs get preview deployments.

**Contributing:** Fork, create a branch (`feature/...` or `fix/...`), run `npm run lint` and `npm run test`, open a PR. Use conventional commits: `feat:`, `fix:`, `docs:`.

**License:** MIT — see [LICENSE](LICENSE).
