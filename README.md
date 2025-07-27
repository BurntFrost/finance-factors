# Finance Factors Dashboard

A comprehensive Next.js 15 dashboard application for visualizing real-time financial and economic data with interactive Chart.js visualizations, featuring live API integration and dynamic data source management.

## 🌟 Key Features

- **🔴 Live Government APIs**: Real-time data from FRED, BLS, Census Bureau
- **📊 Interactive Charts**: Dynamic visualizations with Chart.js
- **🔄 Smart Data Switching**: Toggle between live APIs and historical data
- **⚡ Performance Optimized**: Lazy loading, code splitting, intelligent caching
- **🚀 Easy Deployment**: Vercel (recommended) or GitHub Pages options
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
- **Deployment**: Vercel (recommended) or GitHub Pages

## 📚 Documentation

### Core Documentation
- **[📖 README](README.md)** - Project overview and quick start (you are here)
- **[🏗 ARCHITECTURE](ARCHITECTURE.md)** - System design, component architecture, and technical patterns
- **[💻 DEVELOPMENT](DEVELOPMENT.md)** - Local setup, API integration, and development guides
- **[🚀 DEPLOYMENT](DEPLOYMENT.md)** - Comprehensive deployment guide for Vercel and GitHub Pages

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
| `npm run build:github` | Build for GitHub Pages |
| `npm run deploy:local` | Test build locally |
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

### Option 1: Vercel (Recommended)
- ✅ **Full API functionality** with serverless functions
- ✅ **Automatic deployment** on push to main branch
- ✅ **Real-time data** from government APIs
- ✅ **Performance optimized** with edge caching

### Option 2: GitHub Pages (Backup)
- ✅ **Zero configuration** required
- ✅ **Static hosting** with GitHub's CDN
- ✅ **Historical data** fallback
- ✅ **Fast deployment** in 5 minutes

### Quick Deploy

**Vercel:**
```bash
cd next-dashboard
./setup-vercel-env.sh  # Configure API keys
git push origin main   # Auto-deploy
```

**GitHub Pages:**
```bash
# Enable GitHub Pages in repository settings
git push origin main   # Auto-deploy
```

> **📖 For complete deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)**

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