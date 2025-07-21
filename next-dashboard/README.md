# Finance Factors Dashboard - Next.js Application

> **📖 For complete documentation, see the [main README](../README.md)**

This directory contains the Next.js 15 dashboard application with interactive Chart.js visualizations and live API integration.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

## 📁 Project Structure

```
next-dashboard/
├── app/                    # Next.js App Router
│   ├── components/         # React components
│   ├── context/           # Global state management
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API services
│   └── utils/             # Utility functions
├── .github/workflows/     # GitHub Actions
├── scripts/               # Build and utility scripts
└── public/                # Static assets
```

## 🔧 Available Scripts

- `npm run dev` - Development server with Turbopack
- `npm run build` - Production build
- `npm run build:github` - Build for GitHub Pages
- `npm run build:analyze` - Build with bundle analysis
- `npm run deploy:local` - Test GitHub Pages build locally
- `npm run lint` - ESLint code checking
- `npm run test:apis` - Test API connectivity

## 🌐 Deployment

### GitHub Pages (Recommended)
1. Enable GitHub Pages in repository settings
2. Push to main branch
3. Dashboard goes live automatically!

See [SIMPLE_DEPLOY.md](./SIMPLE_DEPLOY.md) for the 2-step deployment guide.

## 📚 Detailed Documentation

- **[Main README](../README.md)** - Complete project documentation
- **[API Integration](./API_INTEGRATION.md)** - API setup and configuration
- **[Data Source Feature](./DATA_SOURCE_FEATURE.md)** - Dynamic data switching
- **[Chart Refresh Feature](./CHART_REFRESH_FEATURE.md)** - Manual refresh functionality
- **[Data Status Pills](./DATA_STATUS_PILLS_FEATURE.md)** - Status indicators
- **[Deployment Guide](./GITHUB_DEPLOYMENT.md)** - Detailed deployment instructions
- **[Simple Deploy](./SIMPLE_DEPLOY.md)** - Quick 2-step deployment

## 🔗 Live Demo

**[View Live Dashboard](https://burntfrost.github.io/finance-factors/)**

---

Built with Next.js 15, Chart.js, and real government data APIs
