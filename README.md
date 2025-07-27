# Finance Factors Dashboard

A comprehensive Next.js 15 dashboard application for visualizing real-time financial and economic data with interactive Chart.js visualizations, featuring live API integration and dynamic data source management.

## 🌟 Key Features

- **🔴 Live Government APIs**: Real-time data from FRED, BLS, Census Bureau
- **📊 Interactive Charts**: Dynamic visualizations with Chart.js
- **🔄 Smart Data Switching**: Toggle between live APIs and historical data
- **⚡ Performance Optimized**: Lazy loading, code splitting, intelligent caching
- **🚀 Automatic Deployment**: GitHub Actions → Vercel with preview deployments
- **📱 Responsive Design**: Optimized for all devices and screen sizes
- **♿ Accessibility**: Full keyboard navigation and screen reader support

## 🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/BurntFrost/finance-factors.git
cd finance-factors/next-dashboard
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

## 📊 Available Data Sources

| Data Type | Source | Description | Frequency |
|-----------|--------|-------------|-----------|
| House Prices | FRED API | Case-Shiller Home Price Index | Monthly |
| Employment | BLS API | Wages, unemployment rates | Monthly |
| Economic Indicators | FRED API | GDP, interest rates, inflation | Monthly/Quarterly |
| Demographics | Census Bureau | Population, income statistics | Annual |

## 🛠 Technology Stack

- **Framework**: Next.js 15.4.2 with App Router and TypeScript
- **Visualization**: Chart.js 4.5.0 with react-chartjs-2
- **Styling**: CSS Modules with responsive design patterns
- **State Management**: React Context API
- **Deployment**: Vercel with GitHub Actions CI/CD

## 📚 Documentation

### Core Documentation
- **[📖 README](README.md)** - Project overview and quick start (you are here)
- **[🏗 ARCHITECTURE](ARCHITECTURE.md)** - System design, component architecture, and technical patterns
- **[💻 DEVELOPMENT](DEVELOPMENT.md)** - Local setup, API integration, and development guides
- **[🚀 DEPLOYMENT](VERCEL_GITHUB_ACTIONS_SETUP.md)** - Automatic Vercel deployment with GitHub Actions

### Live Demo
**🌐 [View Live Dashboard](https://burntfrost.github.io/finance-factors/)**

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (20+ recommended)
- npm, yarn, or pnpm
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+)

### Installation

```bash
# Clone and install
git clone https://github.com/BurntFrost/finance-factors.git
cd finance-factors/next-dashboard
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run deploy` | Show deployment status (auto via GitHub Actions) |
| `npm run deploy:manual` | Manual Vercel deployment |
| `npm run lint` | Run code quality checks |
| `npm run test:apis` | Test API connectivity |

> **📖 For detailed setup instructions, see [DEVELOPMENT.md](DEVELOPMENT.md)**

## 🔌 API Integration

The dashboard supports live data from free government APIs:

- **FRED API** (Federal Reserve) - Housing prices, interest rates, GDP
- **BLS API** (Bureau of Labor Statistics) - Employment, wages, inflation
- **Census Bureau API** - Demographics, housing, income statistics
- **Alpha Vantage API** - Additional economic indicators (optional)

### Quick API Setup

```bash
# Get FRED API key (recommended first)
# Visit: https://fred.stlouisfed.org/docs/api/api_key.html

# Add to .env.local:
NEXT_PUBLIC_FRED_API_KEY=your_key_here
NEXT_PUBLIC_DEFAULT_DATA_SOURCE=live-api

# Test connectivity
npm run test:apis
```

> **📖 For complete API setup instructions, see [DEVELOPMENT.md](DEVELOPMENT.md)**

## 🚀 Deployment

### Automatic Vercel Deployment (Primary)
- ✅ **GitHub Actions CI/CD** - Push to main = automatic deployment
- ✅ **Full API functionality** with serverless functions
- ✅ **Preview deployments** for pull requests
- ✅ **Real-time data** from government APIs
- ✅ **Performance optimized** with global CDN and edge functions

### Setup Steps

1. **Configure GitHub Secrets** (one-time setup):
   ```bash
   # Get your Vercel project info
   cd next-dashboard
   vercel login
   cat .vercel/project.json  # Copy projectId and orgId
   ```

2. **Add GitHub Secrets**:
   - Go to GitHub repo → Settings → Secrets and variables → Actions
   - Add: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

3. **Deploy**:
   ```bash
   git push origin main   # Automatic deployment via GitHub Actions
   ```

### GitHub Pages (Backup Option)
Available for static hosting without API functionality.

> **📖 For complete setup instructions, see [VERCEL_GITHUB_ACTIONS_SETUP.md](VERCEL_GITHUB_ACTIONS_SETUP.md)**

## ✨ Key Features

### 🔄 Smart Data Management
- **Dynamic Source Switching**: Toggle between live APIs and historical data
- **Intelligent Caching**: 30-minute cache with request deduplication
- **Health Monitoring**: Real-time API status indicators
- **Smart Fallbacks**: Automatic fallback when APIs are unavailable

### 📊 Interactive Visualizations
- **Chart.js Integration**: Smooth animations and responsive charts
- **Manual Refresh**: Click-to-refresh with visual feedback
- **Loading States**: Skeleton loaders and progress indicators
- **Error Recovery**: Graceful error handling with user-friendly messages

### ⚡ Performance Optimized
- **Lazy Loading**: Components loaded on-demand
- **Code Splitting**: Optimized bundle chunks
- **Memory Management**: Automatic cleanup of unused instances
- **Bundle Analysis**: Built-in performance monitoring

### 🛠 Developer Experience
- **TypeScript**: Full type safety with strict mode
- **Hot Reload**: Instant feedback with Turbopack
- **ESLint Integration**: Code quality enforcement
- **Debug Mode**: Detailed API logging and metrics

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**: Follow existing code style and patterns
4. **Add tests**: Ensure new features are tested
5. **Submit a pull request**: Describe your changes and benefits

> **📖 For detailed contributing guidelines, see [DEVELOPMENT.md](DEVELOPMENT.md)**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 External Resources

- [Next.js Documentation](https://nextjs.org/docs) - Framework documentation
- [Chart.js Documentation](https://www.chartjs.org/docs/) - Visualization library
- [FRED API Documentation](https://fred.stlouisfed.org/docs/api/fred/) - Economic data API
- [BLS API Documentation](https://www.bls.gov/developers/api_signature_v2.htm) - Labor statistics

---

**Built with ❤️ using Next.js 15, Chart.js, and real government data APIs**