# Finance Factors Dashboard

**See how the economy and costs that affect you change over time.**

A simple dashboard of US economic and financial data—house prices, income, inflation, interest rates, unemployment, GDP, money supply, and more—with interactive charts. No finance background needed.

**Try it:** [finance-factors.vercel.app](https://finance-factors.vercel.app)

---

## What you can do

- **Browse charts** — Scroll through house prices, inflation, Fed rates, unemployment, GDP growth, treasury yields, and other key indicators.
- **Understand at a glance** — Each chart has a short “what it means” line so you can interpret the numbers.
- **Zoom and pan** — Use the 🔍 and ✋ controls on a chart to zoom in or move around the timeline.
- **Add more charts** — Use **Add element** in the top bar to add extra series (e.g. different visualizations or data types).
- **Choose your data** — Toggle between **sample data** (works immediately, no setup) and **up-to-date data** from government and public sources (optional; see [How the data works](#how-the-data-works)).
- **Faster loading** — Turn on **Faster loading** to load all charts at once instead of one after another.
- **Dark mode** — Use the theme toggle in the header if you prefer a dark layout.

---

## How to use it

### Use the live site

Go to [finance-factors.vercel.app](https://finance-factors.vercel.app). Everything works with sample data; no sign-up or API keys.

### Run it on your computer

If you want to run it locally or use your own API keys for live data:

```bash
git clone https://github.com/BurntFrost/finance-factors.git
cd finance-factors/next-dashboard
npm install
npm run dev
```

Open **http://localhost:3000**. It still works without any API keys (sample data). To use live data, add keys to `.env.local` as in [How the data works](#how-the-data-works).

---

## How the data works

- **Sample data (default)** — The app ships with example data so you can explore all charts and features right away. No configuration.
- **Up-to-date data (optional)** — For recent numbers from official sources, you can add free API keys. The app pulls from:
  - **FRED** — Housing, GDP, rates, inflation
  - **BLS** — Employment, wages, labor stats
  - **Census** — Demographics, income, housing
  - **Alpha Vantage** — Extra indicators (optional)

To use live data locally, copy `.env.example` to `.env.local` and add the keys you want:

```bash
NEXT_PUBLIC_FRED_API_KEY=...
NEXT_PUBLIC_BLS_API_KEY=...
NEXT_PUBLIC_CENSUS_API_KEY=...
NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=...
```

Get keys: [FRED](https://fred.stlouisfed.org/docs/api/api_key.html) · [BLS](https://www.bls.gov/developers/api_signature_v2.htm) · [Census](https://api.census.gov/data/key_signup.html) · [Alpha Vantage](https://www.alphavantage.co/support/#api-key)

---

## For developers

- **Quick start:** `cd next-dashboard && npm install && npm run dev`
- **Scripts:** `npm run dev` (dev server), `npm run build` / `npm run start` (production), `npm run lint`, `npm run test`
- **Optional:** PostgreSQL (Prisma), Redis, GraphQL — see `.env.example` and repo structure in `next-dashboard/`
- **Deploy:** Push to `main` → GitHub Actions deploys to Vercel. PRs get preview deployments.

Contributing: fork, branch (`feature/...`), run `npm run lint` and tests, open a PR (conventional commits: `feat:`, `fix:`, `docs:`).

**License:** MIT — see [LICENSE](LICENSE).
