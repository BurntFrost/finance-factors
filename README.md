# Finance Factors Dashboard

A comprehensive Next.js 15 dashboard application for visualizing real-time financial and economic data with interactive Chart.js visualizations, featuring live API integration, intelligent data source management, and automatic deployment.

## 🌟 Key Features

- **🔴 Live Government APIs**: Real-time data from FRED, BLS, Census Bureau
- **📊 Interactive Charts**: Dynamic visualizations with Chart.js 4.5.0
- **🔄 Smart Data Switching**: Automatic fallback between live APIs and historical data
- **⚡ Performance Optimized**: Lazy loading, code splitting, intelligent caching with TTL
- **🚀 Automatic Deployment**: GitHub Actions → Vercel with preview deployments
- **📱 Responsive Design**: Optimized for all devices and screen sizes
- **♿ Accessibility**: Full keyboard navigation and screen reader support
- **🛡️ CORS-Free**: API proxy eliminates cross-origin issues
- **📈 Real-time Status**: Live API health monitoring and data freshness indicators

## 🌐 Live Demo & Status

**🌐 [View Live Dashboard](https://finance-factors.vercel.app/)**

### Current Deployment Status
- ✅ **Production**: https://finance-factors.vercel.app
- ✅ **API Health**: https://finance-factors.vercel.app/api/proxy/health
- ✅ **Auto-Deploy**: GitHub Actions → Vercel (active)
- ✅ **Preview Deployments**: Automatic for pull requests
- ✅ **API Services**: FRED ✅ | BLS ✅ | Census ✅ | Alpha Vantage ⚠️

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

### Prerequisites

- **Node.js 18+** (Node.js 20+ recommended for optimal performance)
- **Package Manager**: npm, yarn, or pnpm
- **Modern Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Available Scripts

| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run dev` | Start development server with Turbopack | Local development |
| `npm run build` | Build for production | Standard production build |
| `npm run build:analyze` | Build with bundle analysis | Performance optimization |
| `npm run start` | Start production server | Production server deployment |
| `npm run lint` | Run ESLint | Code quality checks |
| `npm run test:apis` | Test API connectivity | API troubleshooting |
| `npm run deploy` | Show deployment status | Check GitHub Actions deployment |
| `npm run deploy:manual` | Manual Vercel deployment | Emergency deployment |

## 📊 Available Data Sources

| Data Type | Source | Description | Frequency | Status |
|-----------|--------|-------------|-----------|---------|
| House Prices | FRED API | Case-Shiller Home Price Index | Monthly | ✅ Active |
| Employment | BLS API | Wages, unemployment rates | Monthly | ✅ Active |
| Economic Indicators | FRED API | GDP, interest rates, inflation | Monthly/Quarterly | ✅ Active |
| Demographics | Census Bureau | Population, income statistics | Annual | ✅ Active |
| Additional Indicators | Alpha Vantage | Stock data, forex | Daily | ⚠️ Optional |

## 🛠 Technology Stack

### Frontend
- **Framework**: Next.js 15.4.2 with App Router
- **Language**: TypeScript with strict mode
- **Visualization**: Chart.js 4.5.0 with react-chartjs-2 5.2.0
- **Styling**: CSS Modules with responsive design
- **State Management**: React Context API with custom hooks

### Backend/API
- **Serverless**: Vercel Functions
- **API Proxy**: Next.js API routes for CORS resolution
- **Caching**: In-memory with TTL (30-minute default)
- **Data Sources**: Government APIs (FRED, BLS, Census)

### Development Tools
- **Build Tool**: Next.js with Turbopack for fast development
- **Linting**: ESLint with Next.js configuration
- **Type Checking**: TypeScript compiler with strict mode
- **Testing**: Built-in API connectivity tests
- **Deployment**: GitHub Actions CI/CD → Vercel

## 🏗 System Architecture

### Architecture Overview

The Finance Factors Dashboard follows a modern React architecture with clear separation of concerns and intelligent data management.

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 15 App Router                    │
├─────────────────────────────────────────────────────────────┤
│  Context Providers (Global State Management)               │
│  ├── DashboardProvider (Element management)                │
│  ├── AutomaticDataSourceProvider (Data source switching)   │
│  └── ViewModeProvider (Edit/Live mode toggle)              │
├─────────────────────────────────────────────────────────────┤
│  Component Layer                                            │
│  ├── AutomaticChart (Smart chart with data source aware)   │
│  ├── DynamicElementRenderer (Dynamic dashboard elements)   │
│  ├── DataStatusPill (Real-time status indicators)         │
│  └── UI Components (Dropdowns, toggles, controls)         │
├─────────────────────────────────────────────────────────────┤
│  Hooks Layer (Custom React Hooks)                          │
│  ├── useDataSource (Data fetching & caching)              │
│  ├── useDashboard (Dashboard state management)            │
│  └── useViewMode (Edit/Live mode state)                   │
├─────────────────────────────────────────────────────────────┤
│  Services Layer (Data & API Management)                    │
│  ├── realApiService (Live government APIs orchestrator)    │
│  ├── dataTransformers (Data format standardization)       │
│  ├── historicalDataGenerators (Sample data generation)    │
│  └── apiCache (Intelligent caching with TTL)              │
├─────────────────────────────────────────────────────────────┤
│  External APIs (Government Data Sources)                   │
│  ├── FRED API (Federal Reserve Economic Data)              │
│  ├── BLS API (Bureau of Labor Statistics)                  │
│  ├── Census Bureau API (Demographics & Housing)            │
│  └── Alpha Vantage API (Additional economic indicators)    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
User Interaction
       ↓
Context Providers (State Management)
       ↓
Custom Hooks (useDataSource, useDashboard)
       ↓
Services Layer (API calls, caching, transformations)
       ↓
External APIs / Historical Data Generators
       ↓
Data Transformers (Standardize format)
       ↓
Chart.js Components (Visualization)
       ↓
User Interface (Interactive charts & controls)
```

### Core Components

#### 1. **AutomaticChart Component**
- **Purpose**: Intelligent chart component that adapts to data source changes
- **Features**:
  - Data source awareness with automatic fallback
  - Automatic refresh functionality with configurable intervals
  - Loading states and error boundaries
  - Chart.js integration with smooth animations
  - Real-time status indicators
- **Props**: `dataType`, `chartType`, `title`, `refreshInterval`, `showIndicator`

#### 2. **DataStatusPill Component**
- **Purpose**: Visual indicators for data freshness and authenticity
- **Status Types**:
  - 🟢 Live Data (`recent`) - Recently updated real data
  - 📊 Historical Data (`historical`) - Real historical financial data
  - 🔴 Outdated (`stale`) - Real data that may be outdated
  - ⏳ Loading (`loading`) - Data is being loaded
- **Features**: Color-coded indicators, responsive design, accessibility support

#### 3. **DynamicElementRenderer Component**
- **Purpose**: Renders dashboard elements dynamically based on configuration
- **Features**: Supports multiple chart types, lazy loading, error boundaries

### Context Providers

#### 1. **DashboardProvider**
- **Responsibility**: Global dashboard state management
- **State**: Dashboard elements, layout configuration, user preferences
- **Actions**: Add/remove elements, update configurations, persist state

#### 2. **AutomaticDataSourceProvider**
- **Responsibility**: Data source switching and management
- **State**: Current data source, available sources, loading states
- **Actions**: Switch data sources, refresh data, handle fallbacks

#### 3. **ViewModeProvider**
- **Responsibility**: Edit/Live mode state management
- **State**: Current view mode, edit permissions
- **Actions**: Toggle modes, manage edit state

## 💻 Development Guide

### API Integration

#### Supported APIs (All Free Government Data)

##### 1. FRED API (Federal Reserve Economic Data) - **Recommended First**
- **Provider**: Federal Reserve Bank of St. Louis
- **Cost**: Free with API key
- **Rate Limit**: 120 requests/minute
- **Setup**: [Get API key](https://fred.stlouisfed.org/docs/api/api_key.html)
- **Data**: Housing prices, interest rates, GDP, unemployment

##### 2. BLS API (Bureau of Labor Statistics)
- **Provider**: U.S. Bureau of Labor Statistics
- **Cost**: Free (500 requests/day with key vs 25 without)
- **Setup**: [Get API key](https://www.bls.gov/developers/api_signature_v2.htm)
- **Data**: Employment, wages, inflation, labor statistics

##### 3. Census Bureau API
- **Provider**: U.S. Census Bureau
- **Cost**: Free (optional API key for higher limits)
- **Setup**: [Get API key](https://api.census.gov/data/key_signup.html)
- **Data**: Demographics, housing, income statistics

##### 4. Alpha Vantage API (Optional)
- **Provider**: Alpha Vantage Inc.
- **Cost**: Free tier (25 requests/day)
- **Setup**: [Get API key](https://www.alphavantage.co/support/#api-key)
- **Data**: Additional economic indicators

### Local Development API Setup

1. **Create environment file**:
   ```bash
   cp .env.example .env.local
   ```

2. **Get FRED API key** (recommended first step):
   ```bash
   # Visit: https://fred.stlouisfed.org/docs/api/api_key.html
   # Add to .env.local:
   NEXT_PUBLIC_FRED_API_KEY=your_key_here
   NEXT_PUBLIC_DEFAULT_DATA_SOURCE=live-api
   ```

3. **Test API connectivity**:
   ```bash
   npm run test:apis
   ```

### Environment Variables

#### Required for Live Data
```bash
# FRED API (Recommended first)
NEXT_PUBLIC_FRED_API_KEY=your_fred_api_key
NEXT_PUBLIC_FRED_BASE_URL=https://api.stlouisfed.org/fred

# BLS API (Optional but recommended)
NEXT_PUBLIC_BLS_API_KEY=your_bls_api_key
NEXT_PUBLIC_BLS_BASE_URL=https://api.bls.gov/publicAPI/v2

# Census Bureau API (Optional)
NEXT_PUBLIC_CENSUS_API_KEY=your_census_api_key
NEXT_PUBLIC_CENSUS_BASE_URL=https://api.census.gov/data

# Alpha Vantage API (Optional)
NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
NEXT_PUBLIC_ALPHA_VANTAGE_BASE_URL=https://www.alphavantage.co/query
```

#### Application Configuration
```bash
# Default data source: 'historical' or 'live-api'
NEXT_PUBLIC_DEFAULT_DATA_SOURCE=live-api

# Enable API proxy to solve CORS issues
NEXT_PUBLIC_USE_API_PROXY=true

# Enable debug logging for API calls
NEXT_PUBLIC_DEBUG_API=false

# Cache duration in minutes
NEXT_PUBLIC_CACHE_DURATION=30
```

## 🚀 Deployment

### ✅ Fully Automated Vercel Deployment

The project is configured with **automatic deployment** via GitHub Actions:

- 🚀 **Push to `main`** → Automatic production deployment to Vercel
- 🔍 **Pull Requests** → Automatic preview deployments with PR comments
- ⚡ **Full API functionality** with serverless functions
- 🌐 **Global CDN** with edge functions for optimal performance
- 📊 **Real-time government data** from FRED, BLS, and Census APIs

### How It Works

```bash
# Make changes and push - that's it!
git add .
git commit -m "Add new feature"
git push origin main
# → GitHub Actions automatically deploys to Vercel
# → Live at: https://finance-factors.vercel.app
```

### Current Deployment Status

- ✅ **GitHub Secrets**: Configured
- ✅ **Vercel Project**: Connected
- ✅ **GitHub Actions**: Active
- ✅ **API Endpoints**: Live
- ✅ **Auto-Deploy**: Enabled

### Monitor Deployments

- **GitHub Actions**: [View workflow runs](https://github.com/BurntFrost/finance-factors/actions)
- **Vercel Dashboard**: [View deployments](https://vercel.com/dashboard)
- **Live Site**: [https://finance-factors.vercel.app](https://finance-factors.vercel.app)
- **API Health**: [https://finance-factors.vercel.app/api/proxy/health](https://finance-factors.vercel.app/api/proxy/health)

### GitHub Secrets Configuration

The required GitHub secrets are configured:

| Secret Name | Status | Description |
|-------------|--------|-------------|
| `VERCEL_TOKEN` | ✅ Set | Your Vercel API token |
| `VERCEL_ORG_ID` | ✅ Set | Your Vercel organization ID |
| `VERCEL_PROJECT_ID` | ✅ Set | Your Vercel project ID |

### Optional Environment Variables

These can be added as GitHub secrets for API keys:

| Secret Name | Status | Description |
|-------------|--------|-------------|
| `FRED_API_KEY` | Optional | Federal Reserve Economic Data API key |
| `BLS_API_KEY` | Optional | Bureau of Labor Statistics API key |
| `CENSUS_API_KEY` | Optional | US Census Bureau API key |
| `ALPHA_VANTAGE_API_KEY` | Optional | Alpha Vantage financial data API key |

### Daily Workflow

Your typical development workflow:

1. **Develop**: Make changes locally with `npm run dev`
2. **Commit**: `git add . && git commit -m "Your changes"`
3. **Deploy**: `git push origin main` (automatic deployment starts)
4. **Monitor**: Check GitHub Actions for deployment status
5. **Verify**: Visit https://finance-factors.vercel.app to see changes live

## 📈 API Integration Details

### API Proxy Architecture

The application uses a Next.js API proxy to eliminate CORS issues:

```
Browser → Next.js API Route → Government API → Response
```

### Intelligent Caching

- **TTL-based caching**: 30-minute default cache duration
- **Memory-efficient**: In-memory cache with automatic cleanup
- **API-aware**: Different cache strategies per API provider
- **Fallback support**: Automatic fallback to cached data on API failures

### Data Source Priority

The system uses intelligent fallback mechanisms:

1. **Primary**: Live API data (if available and fresh)
2. **Secondary**: Cached API data (if within TTL)
3. **Tertiary**: Historical sample data (always available)

### Rate Limiting

Built-in rate limiting respects API provider limits:

- **FRED API**: 120 requests/minute
- **BLS API**: 10 requests/minute (500/day with key)
- **Census API**: 100 requests/minute
- **Alpha Vantage**: 5 requests/minute (25/day free tier)

## 📚 Project Structure

```
finance-factors/
├── next-dashboard/                 # Main Next.js application
│   ├── app/                       # Next.js 15 App Router
│   │   ├── api/                   # API routes and proxy
│   │   │   ├── proxy/             # API proxy endpoints
│   │   │   ├── services/          # API service implementations
│   │   │   └── types/             # API type definitions
│   │   ├── components/            # React components
│   │   │   ├── AutomaticChart.tsx # Smart chart component
│   │   │   ├── DataStatusPill.tsx # Status indicators
│   │   │   └── ...                # Other UI components
│   │   ├── context/               # React Context providers
│   │   │   ├── DashboardContext.tsx
│   │   │   ├── DataSourceContext.tsx
│   │   │   └── ViewModeContext.tsx
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── services/              # Data services
│   │   │   ├── realApiService.ts  # Live API orchestrator
│   │   │   ├── dataTransformers.ts
│   │   │   └── ...                # API service implementations
│   │   ├── types/                 # TypeScript definitions
│   │   └── utils/                 # Utility functions
│   ├── package.json               # Dependencies and scripts
│   ├── next.config.ts             # Next.js configuration
│   ├── tsconfig.json              # TypeScript configuration
│   └── vercel.json                # Vercel deployment config
├── README.md                      # This comprehensive guide
└── LICENSE                        # MIT License
```

## 🧪 Testing & Quality

### Available Tests

```bash
# Test API connectivity
npm run test:apis

# Test specific API proxy endpoints
npm run test:proxy

# Test house prices data endpoint
npm run test:house-prices

# Test deployment readiness
npm run test:deployment

# Run linting
npm run lint
```

### Code Quality

- **TypeScript**: Strict mode enabled for type safety
- **ESLint**: Next.js configuration with custom rules
- **Error Boundaries**: Comprehensive error handling
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Lazy loading, code splitting, caching

## 📋 Recent Updates & Changes

### Latest Improvements (2024)

#### ✅ CORS Resolution & API Proxy
- **Fixed**: All CORS issues with government APIs
- **Added**: Next.js API proxy for seamless data fetching
- **Improved**: Error handling and fallback mechanisms

#### ✅ Deployment Optimization
- **Removed**: GitHub Pages compatibility (simplified architecture)
- **Enhanced**: Vercel deployment with full API support
- **Added**: Automatic preview deployments for pull requests

#### ✅ Performance Enhancements
- **Upgraded**: Next.js 15.4.2 with Turbopack
- **Optimized**: Chart.js rendering with lazy loading
- **Improved**: Caching strategy with TTL-based invalidation

#### ✅ API Integration Improvements
- **Enhanced**: FRED API integration with better error handling
- **Added**: BLS API support for employment data
- **Improved**: Census Bureau API integration
- **Fixed**: Rate limiting and request optimization

#### ✅ User Experience
- **Added**: Real-time API health status indicators
- **Improved**: Data source switching with visual feedback
- **Enhanced**: Loading states and error boundaries
- **Added**: Automatic data refresh with configurable intervals

### Current Status

- **Build Status**: ✅ Passing
- **Deployment**: ✅ Automatic via GitHub Actions
- **API Health**: ✅ All major APIs operational
- **Performance**: ✅ Optimized for Core Web Vitals
- **Accessibility**: ✅ WCAG 2.1 AA compliant
- **Type Safety**: ✅ Full TypeScript coverage

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** with proper TypeScript types
4. **Test your changes**: `npm run test:apis && npm run lint`
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request** (automatic preview deployment will be created)

### Code Standards

- **TypeScript**: All new code must include proper type definitions
- **ESLint**: Follow the existing linting rules
- **Components**: Use functional components with hooks
- **Styling**: Use CSS Modules for component-specific styles
- **API Integration**: Use the existing service layer patterns
- **Testing**: Add tests for new API integrations

### Adding New Data Sources

1. **Create API service**: Add new service in `app/services/`
2. **Update types**: Add data types in `app/types/dataSource.ts`
3. **Add transformer**: Create data transformer in `app/services/dataTransformers.ts`
4. **Update real API service**: Register new service in `realApiService.ts`
5. **Add tests**: Create connectivity tests
6. **Update documentation**: Add API details to this README

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo**: [https://finance-factors.vercel.app](https://finance-factors.vercel.app)
- **GitHub Repository**: [https://github.com/BurntFrost/finance-factors](https://github.com/BurntFrost/finance-factors)
- **API Health Check**: [https://finance-factors.vercel.app/api/proxy/health](https://finance-factors.vercel.app/api/proxy/health)
- **GitHub Actions**: [https://github.com/BurntFrost/finance-factors/actions](https://github.com/BurntFrost/finance-factors/actions)
- **Vercel Dashboard**: [https://vercel.com/dashboard](https://vercel.com/dashboard)

---

**Built with ❤️ using Next.js 15, Chart.js, and government open data APIs**

*Last updated: July 2024*