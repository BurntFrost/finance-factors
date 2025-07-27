# Finance Factors Dashboard

A comprehensive Next.js 15 dashboard application for visualizing real-time financial and economic data with interactive Chart.js visualizations, featuring live API integration and dynamic data source management.

## 🌟 Key Features

### Real Financial Data Integration
- **Live Government APIs**: FRED, BLS, Census Bureau, and Alpha Vantage integration
- **Real-time Data**: Housing prices, employment data, economic indicators, and market trends
- **Smart Fallbacks**: Graceful degradation to historical data when APIs are unavailable
- **Data Status Indicators**: Visual pills showing data freshness and authenticity

### Interactive User Experience
- **Dynamic Data Source Switching**: Toggle between historical data and live APIs with card flip animations
- **Chart Refresh Functionality**: Manual refresh with visual feedback and smooth animations
- **Responsive Design**: Optimized for desktop, tablet, and mobile viewing
- **Accessibility**: Full keyboard navigation and screen reader support

### Performance & Deployment
- **Vercel Ready**: Automatic deployment with full API functionality and serverless functions
- **GitHub Pages Backup**: Static deployment option with historical data fallback
- **Performance Optimized**: Lazy loading, code splitting, and intelligent caching
- **Web Vitals Monitoring**: Built-in performance tracking and optimization
- **API Proxy**: Secure server-side API calls with caching and rate limiting
- **Auto-Deploy**: Push to main branch triggers automatic production deployment

## 📊 Available Data Sources

### Live APIs (Free Government Data)
> **Note**: Live APIs require proper server setup due to CORS restrictions. GitHub Pages deployment uses historical data by default.

| Data Type | Primary Source | Description | Update Frequency |
|-----------|----------------|-------------|------------------|
| House Prices | FRED API | Case-Shiller Home Price Index | Monthly |
| Employment Data | BLS API | Average hourly earnings, unemployment | Monthly |
| Economic Indicators | FRED API | GDP, interest rates, inflation | Quarterly/Monthly |
| Demographics | Census Bureau | Population, income statistics | Annual |
| Market Data | Alpha Vantage | Additional economic indicators | Daily |

### Historical Data (Default for GitHub Pages)
- Real historical financial trends with authentic volatility and seasonal patterns
- Perfect for development, testing, and demonstrations
- Consistent data format matching live APIs
- No API keys or server setup required

## 🛠 Technology Stack

- **Framework**: Next.js 15.4.2 with App Router and TypeScript
- **Visualization**: Chart.js 4.5.0 with react-chartjs-2
- **Styling**: CSS Modules with responsive design patterns
- **State Management**: React Context API for global data source management
- **Performance**: Lazy loading, code splitting, and intelligent caching
- **Deployment**: GitHub Pages with automated workflows

## 🏗 Architecture & Design

### System Architecture Overview

The Finance Factors Dashboard follows a modern React architecture with clear separation of concerns:

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

### Project Structure
```
next-dashboard/
├── app/                            # Next.js 15 App Router
│   ├── components/                 # React Components
│   │   ├── AutomaticChart.tsx      # Smart chart with data source awareness
│   │   ├── DynamicElementRenderer.tsx # Dynamic dashboard elements
│   │   ├── AddElementDropdown.tsx  # Element creation interface
│   │   ├── DataStatusPill.tsx      # Real-time status indicators
│   │   ├── ViewModeToggle.tsx      # Edit/Live mode switcher
│   │   ├── ApiHealthStatus.tsx     # API connectivity status
│   │   ├── ErrorBoundary.tsx       # Error handling wrapper
│   │   ├── ToastManager.tsx        # Notification system
│   │   └── HydrationSafeWrapper.tsx # SSR hydration safety
│   ├── context/                    # React Context Providers
│   │   ├── DashboardContext.tsx    # Dashboard state management
│   │   ├── AutomaticDataSourceContext.tsx # Data source switching
│   │   └── ViewModeContext.tsx     # Edit/Live mode state
│   ├── hooks/                      # Custom React Hooks
│   │   ├── useDataSource.ts        # Data fetching & caching
│   │   ├── useDashboard.ts         # Dashboard operations
│   │   └── useViewMode.ts          # View mode management
│   ├── services/                   # Data Services Layer
│   │   ├── realApiService.ts       # Live API orchestrator
│   │   ├── dataTransformers.ts     # Data format standardization
│   │   ├── apiCache.ts             # Intelligent caching system
│   │   └── mockApiService.ts       # Development/testing data
│   ├── utils/                      # Utility Functions
│   │   ├── historicalDataGenerators.ts # Sample data generation
│   │   ├── localStorage.ts         # Browser storage utilities
│   │   └── apiHelpers.ts           # API utility functions
│   ├── types/                      # TypeScript Definitions
│   │   ├── dashboard.ts            # Dashboard-related types
│   │   ├── api.ts                  # API response types
│   │   └── chart.ts                # Chart.js type extensions
│   ├── config/                     # Configuration Files
│   │   ├── apiConfig.ts            # API endpoints & settings
│   │   └── chartConfig.ts          # Chart.js default configurations
│   ├── layout.tsx                  # Root layout with providers
│   ├── page.tsx                    # Main dashboard page
│   ├── page.module.css             # Page-specific styles
│   └── globals.css                 # Global styles & CSS variables
├── .github/workflows/              # CI/CD Pipeline
│   └── deploy.yml                  # Automated GitHub Pages deployment
├── scripts/                        # Build & Development Scripts
│   └── test-apis.js                # API connectivity testing
├── next.config.ts                  # Next.js configuration & optimizations
├── package.json                    # Dependencies & npm scripts
├── tsconfig.json                   # TypeScript configuration
└── Documentation/                  # Feature Documentation
    ├── API_INTEGRATION.md          # API setup guide
    ├── DATA_SOURCE_FEATURE.md      # Data source switching
    ├── CHART_REFRESH_FEATURE.md    # Manual refresh functionality
    ├── DATA_STATUS_PILLS_FEATURE.md # Status indicators
    └── GITHUB_DEPLOYMENT.md        # Deployment instructions
```

### Key Design Patterns

#### 1. **Context-Driven Architecture**
- **Global State Management**: React Context API for cross-component state sharing
- **Provider Pattern**: Nested providers for different concerns (Dashboard, DataSource, ViewMode)
- **Separation of Concerns**: Each context handles a specific domain of functionality

#### 2. **Smart Component Pattern**
- **AutomaticChart**: Intelligent chart component that adapts to data source changes
- **Data Source Awareness**: Components automatically react to data source switching
- **Lazy Loading**: Chart.js components loaded on-demand for performance

#### 3. **Service Layer Pattern**
- **API Orchestration**: Single service coordinates multiple government APIs
- **Data Transformation**: Consistent data format across different API sources
- **Caching Strategy**: Intelligent caching with TTL and request deduplication

#### 4. **Error Boundary Pattern**
- **Graceful Degradation**: Fallback to historical data when APIs fail
- **User-Friendly Errors**: Clear error messages with recovery suggestions
- **Resilient UI**: Application continues functioning despite individual component failures

## 🚀 Quick Start & Usage

### Prerequisites
- **Node.js 18+** (Node.js 20+ recommended for optimal performance)
- **Package Manager**: npm, yarn, or pnpm
- **Modern Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/BurntFrost/finance-factors.git
   cd finance-factors/next-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Configure APIs (Optional for live data)**
   ```bash
   # Copy environment template (if available)
   cp .env.example .env.local

   # Add your API keys for live data (see API Integration section)
   # NEXT_PUBLIC_FRED_API_KEY=your_key_here
   # NEXT_PUBLIC_DEFAULT_DATA_SOURCE=live-api
   ```

4. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run dev` | Start development server with Turbopack | Local development |
| `npm run build` | Build for production | Standard production build |
| `npm run build:github` | Build for GitHub Pages deployment | GitHub Pages with base path |
| `npm run build:analyze` | Build with bundle analysis | Performance optimization |
| `npm run deploy:local` | Test GitHub Pages build locally | Pre-deployment testing |
| `npm run start` | Start production server | Production server deployment |
| `npm run lint` | Run ESLint | Code quality checks |
| `npm run test:apis` | Test API connectivity | API troubleshooting |

### Usage Modes

#### 1. **Development Mode** (Default)
- Uses historical data for consistent development experience
- No API keys required
- Full feature functionality with sample data
- Hot reload and development optimizations enabled

#### 2. **Live Data Mode** (Optional)
- Requires API keys for government data sources
- Real-time financial and economic data
- Automatic fallback to historical data on API failures
- Production-ready data visualization

#### 3. **GitHub Pages Mode** (Deployment)
- Optimized static build for GitHub Pages
- Embedded API keys (public government APIs)
- Asset path optimization for repository deployment
- Automatic CI/CD pipeline deployment

## 🔌 API Integration

### Supported APIs (All Free)

#### 1. FRED API (Federal Reserve Economic Data) - **Recommended First**
- **Provider**: Federal Reserve Bank of St. Louis
- **Cost**: Free with API key
- **Rate Limit**: 120 requests/minute
- **Setup**: [Get API key](https://fred.stlouisfed.org/docs/api/api_key.html)
- **Data**: Housing prices, interest rates, GDP, unemployment

#### 2. BLS API (Bureau of Labor Statistics)
- **Provider**: U.S. Bureau of Labor Statistics
- **Cost**: Free (500 requests/day with key vs 25 without)
- **Setup**: [Get API key](https://www.bls.gov/developers/api_signature_v2.htm)
- **Data**: Employment, wages, inflation, labor statistics

#### 3. Census Bureau API
- **Provider**: U.S. Census Bureau
- **Cost**: Free (optional API key for higher limits)
- **Setup**: [Get API key](https://api.census.gov/data/key_signup.html)
- **Data**: Demographics, housing, income statistics

#### 4. Alpha Vantage API (Optional)
- **Provider**: Alpha Vantage Inc.
- **Cost**: Free tier (25 requests/day)
- **Setup**: [Get API key](https://www.alphavantage.co/support/#api-key)
- **Data**: Additional economic indicators

### Quick API Setup

1. **Get FRED API key** (recommended first step):
   ```bash
   # Visit: https://fred.stlouisfed.org/docs/api/api_key.html
   # Add to .env.local:
   NEXT_PUBLIC_FRED_API_KEY=your_key_here
   NEXT_PUBLIC_DEFAULT_DATA_SOURCE=live-api
   ```

2. **Test API connectivity**:
   ```bash
   npm run test:apis
   ```

### Data Source Management

The dashboard includes intelligent data source switching:

- **Historical Data Mode**: Real historical financial data for development and analysis
- **Live API Mode**: Real government data with automatic fallbacks
- **Persistent Preferences**: User selections saved in localStorage
- **Health Monitoring**: Visual indicators for API status and data freshness

## 🚀 Deployment Options

### Option 1: Vercel Deployment (Recommended) ✅ **CONFIGURED**

**Full API functionality with Git integration - automatic deployment on every push to main branch.**

#### ✅ Already Set Up!
Your project already has Vercel Git integration configured with deploy hook:
`https://api.vercel.com/v1/integrations/deploy/prj_DSmy4FBhYDJiUQr6YbNsXg3Nw7gt/xyCW8UBEuO`

#### Quick Setup (Only API Keys Needed)
See detailed guide in `VERCEL_GIT_INTEGRATION_SETUP.md`:

1. **Configure API keys** in Vercel dashboard (one-time setup)
2. **Push to deploy**: Automatic deployment already works!

```bash
# Configure API keys (one-time)
cd next-dashboard
./setup-vercel-env.sh

# Then just push to deploy
git add .
git commit -m "Deploy with full API functionality"
git push origin main
```

**Benefits:**
✅ **Git Integration**: Native Vercel integration (no GitHub Actions needed)
✅ **Full API Functionality**: Server-side API proxy with secure key management
✅ **Automatic Deployment**: Push to main triggers production deployment
✅ **Performance Optimized**: Edge caching, CDN, and serverless functions
✅ **Real-time Data**: Live government APIs with intelligent caching

### Option 2: GitHub Pages Deployment (Backup)

**Static deployment with client-side API calls and historical data fallback.**

#### Simple Setup (2 Steps)
1. **Enable GitHub Pages**: Go to repository Settings → Pages → Source: "GitHub Actions"
2. **Push to deploy**: Automatic deployment on push to main

```bash
git add .
git commit -m "Deploy static version"
git push origin main
```

**Benefits:**
✅ **Zero Configuration**: No secrets or tokens required
✅ **Static Hosting**: Fast loading with GitHub's CDN
✅ **Fallback Option**: Works when Vercel isn't available
✅ **Historical Data**: Reliable sample data for demonstrations

### Deployment Timeline
- **Push code**: Instant
- **Build starts**: ~30 seconds
- **Build completes**: ~3 minutes
- **Site live**: ~5 minutes total

### Manual Build Options
```bash
npm run build              # Standard build
npm run build:github       # Build for GitHub Pages
npm run deploy:local       # Test locally with serve
npm run build:analyze      # Build with bundle analysis
```

## 🎯 Advanced Features & Technical Implementation

### Interactive Data Source Management
- **Dynamic Switching**: Toggle between historical data and live APIs with visual feedback
- **Persistent Preferences**: User selections saved across browser sessions using localStorage
- **Health Monitoring**: Real-time API status indicators with color-coded pills
- **Smart Fallbacks**: Automatic fallback to cached or historical data when APIs fail
- **Context-Driven**: Global state management through React Context API
- **Type Safety**: Full TypeScript integration with strict type checking

### Chart Refresh & Interactivity
- **Manual Refresh**: Click-to-refresh functionality with spinning animations
- **Auto-refresh**: Optional automatic data updates at configurable intervals
- **Smooth Animations**: Chart.js integration with 750ms easing transitions
- **Loading States**: Skeleton loaders and progress indicators during data fetching
- **Error Recovery**: Graceful error handling with user-friendly messages
- **Data Validation**: Runtime data validation and transformation

### Data Status Indicators & Health Monitoring
- **🟢 Live Data**: Recently updated real data with timestamps
- **📊 Historical Data**: Real historical financial data for analysis
- **🔴 Outdated**: Real data that may need refreshing
- **⏳ Loading**: Data currently being fetched
- **⚠️ Error State**: Clear error messages with recovery suggestions
- **🔄 Refreshing**: Visual feedback during data updates

### Performance Optimizations & Caching
- **Lazy Loading**: Chart components loaded on-demand with React.lazy()
- **Code Splitting**: Separate chunks for React, Chart.js, and application code
- **Intelligent Caching**: 30-minute cache for API responses with request deduplication
- **Bundle Analysis**: Built-in webpack bundle analyzer (`npm run build:analyze`)
- **Memory Management**: Automatic cleanup of unused chart instances
- **Request Optimization**: Debounced API calls and request batching

### Real-Time Features
- **Live Data Updates**: Automatic refresh of financial data from government APIs
- **WebSocket Ready**: Architecture prepared for real-time data streaming
- **Background Sync**: Service worker integration for offline data caching
- **Progressive Enhancement**: Works offline with cached historical data

### Developer Experience
- **Hot Reload**: Instant development feedback with Turbopack
- **TypeScript**: Full type safety with strict mode enabled
- **ESLint Integration**: Code quality enforcement with Next.js config
- **Error Boundaries**: Comprehensive error handling and recovery
- **Debug Mode**: Detailed API logging and performance metrics
- **Testing Utilities**: Built-in API connectivity testing

## 🔧 Configuration & Environment Variables

### Development Configuration
```bash
# .env.local (for development)
NEXT_PUBLIC_DEFAULT_DATA_SOURCE=historical      # or 'live-api'
NEXT_PUBLIC_FRED_API_KEY=your_fred_key          # Federal Reserve Economic Data
NEXT_PUBLIC_BLS_API_KEY=your_bls_key            # Bureau of Labor Statistics
NEXT_PUBLIC_CENSUS_API_KEY=your_census_key      # U.S. Census Bureau
NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=your_av_key   # Alpha Vantage (optional)
NEXT_PUBLIC_DEBUG_API=true                      # Enable API debug logging
NEXT_PUBLIC_ENABLE_CACHING=true                 # Enable intelligent caching
```

### Production Configuration
```bash
# Environment variables for GitHub Pages (embedded in workflow)
NEXT_PUBLIC_DEFAULT_DATA_SOURCE=historical      # Uses historical data to avoid CORS
NEXT_PUBLIC_ENABLE_CACHING=true                 # Enable production caching
NEXT_PUBLIC_DEBUG_API=false                     # Disable debug logging
NEXT_PUBLIC_BASE_PATH=/finance-factors          # GitHub Pages base path
```

### Next.js Configuration Highlights

#### Static Export & GitHub Pages
- **Static Export**: Enabled for GitHub Pages compatibility with `output: 'export'`
- **Asset Optimization**: Dynamic base path handling for repository deployments
- **Image Optimization**: Disabled for static export (`unoptimized: true`)
- **Trailing Slash**: Enabled for consistent routing (`trailingSlash: true`)

#### Performance Optimizations
- **Webpack Bundle Splitting**: Custom chunk splitting for optimal caching
  - Separate chunks for React, Chart.js, and application code
  - Priority-based chunk loading for critical resources
- **Compression**: Gzip compression enabled for all assets
- **Bundle Analysis**: Integrated webpack-bundle-analyzer for performance monitoring

#### Development Features
- **Turbopack**: Next.js 15 Turbopack for faster development builds
- **Hot Reload**: Instant feedback during development
- **TypeScript**: Full TypeScript support with strict mode
- **ESLint**: Integrated linting with Next.js configuration

### API Configuration Details

#### FRED API (Federal Reserve Economic Data)
```typescript
// Configuration in app/config/apiConfig.ts
export const FRED_CONFIG = {
  baseUrl: 'https://api.stlouisfed.org/fred',
  apiKey: process.env.NEXT_PUBLIC_FRED_API_KEY,
  rateLimit: 120, // requests per minute
  timeout: 10000, // 10 seconds
  retries: 3,
  cacheTTL: 1800000, // 30 minutes
};
```

#### BLS API (Bureau of Labor Statistics)
```typescript
export const BLS_CONFIG = {
  baseUrl: 'https://api.bls.gov/publicAPI/v2',
  apiKey: process.env.NEXT_PUBLIC_BLS_API_KEY,
  rateLimit: 500, // requests per day with key
  timeout: 15000, // 15 seconds
  retries: 2,
  cacheTTL: 3600000, // 1 hour
};
```

#### Caching Strategy
```typescript
// Intelligent caching with TTL and request deduplication
export const CACHE_CONFIG = {
  defaultTTL: 1800000, // 30 minutes
  maxSize: 100, // Maximum cached items
  enableDeduplication: true,
  enablePersistence: true, // localStorage persistence
};
```

## 🚨 Troubleshooting

### Common Issues & Solutions

#### Build Fails
- **Check Actions Log**: Review detailed build logs in GitHub Actions tab
- **Verify Dependencies**: Ensure all packages in package.json are compatible
- **API Keys**: Verify API keys are valid (though not required for build)
- **Syntax Errors**: Run `npm run lint` to check for code issues

#### Site Not Loading
- **Wait for Deployment**: Initial deployment takes 5-10 minutes
- **Check GitHub Pages Settings**: Ensure "GitHub Actions" is selected as source
- **Hard Refresh**: Clear browser cache (Ctrl+F5 or Cmd+Shift+R)
- **Check URL**: Verify correct GitHub Pages URL format

#### API Data Not Loading
- **Check Browser Console**: Look for API errors in developer tools
- **Test APIs Locally**: Run `npm run test:apis` to verify connectivity
- **Rate Limits**: Check if API rate limits have been exceeded
- **API Status**: Verify API services are operational

#### Charts Not Displaying
- **JavaScript Errors**: Check browser console for Chart.js errors
- **Network Issues**: Check network tab for failed resource requests
- **Browser Compatibility**: Test in different browsers (Chrome, Firefox, Safari)
- **Data Format**: Verify data matches expected ChartData interface

### Debug Mode
Enable detailed logging:
```bash
# In .env.local
NEXT_PUBLIC_DEBUG_API=true
```
This logs all API requests and responses to browser console.

## 📱 Browser Support & Accessibility

### Browser Compatibility
- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 90+
- **Responsive Design**: Optimized for all screen sizes (320px to 4K)
- **Progressive Enhancement**: Graceful degradation for older browsers

### Accessibility Features
- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Screen Readers**: ARIA labels and semantic HTML structure
- **High Contrast**: Support for high contrast mode and custom themes
- **Reduced Motion**: Respects user's motion preferences
- **Color Accessibility**: Sufficient color contrast ratios (WCAG 2.1 AA)

## 🔄 Advanced Usage Patterns

### Custom Data Sources
```typescript
// Adding a new data source
import { DataSourceType } from './types/dashboard';

// 1. Define the data source type
const customDataSource: DataSourceType = 'custom-api';

// 2. Add configuration
export const CUSTOM_API_CONFIG = {
  name: 'Custom Financial API',
  description: 'Your custom data source',
  baseUrl: 'https://api.example.com',
  requiresAuth: true,
  rateLimit: 1000,
};

// 3. Implement data transformer
export const transformCustomData = (rawData: any): ChartData => {
  return {
    labels: rawData.dates,
    datasets: [{
      label: 'Custom Data',
      data: rawData.values,
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  };
};
```

### Custom Chart Types
```typescript
// Creating a custom chart component
import { AutomaticChart } from './components/AutomaticChart';

const CustomFinancialChart = () => {
  return (
    <AutomaticChart
      dataType="custom-financial-data"
      chartType="line"
      title="Custom Financial Metrics"
      options={{
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Custom Chart' }
        }
      }}
    />
  );
};
```

### API Integration Patterns
```typescript
// Custom hook for specific data needs
export function useCustomFinancialData() {
  const { fetchData, state } = useDataSource({
    dataType: 'custom-financial',
    autoFetch: true,
    useCache: true,
    cacheTTL: 900000, // 15 minutes
  });

  const refreshData = useCallback(async () => {
    try {
      const data = await fetchData();
      return data;
    } catch (error) {
      console.error('Failed to fetch custom data:', error);
      throw error;
    }
  }, [fetchData]);

  return {
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    refresh: refreshData,
  };
}
```

## 🤝 Contributing & Development

### Contributing Guidelines

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**: Follow the existing code style and patterns
4. **Add tests**: Ensure new features are tested
5. **Commit changes**: `git commit -m 'Add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Submit a pull request**: Describe your changes and their benefits

### Development Standards

#### Code Style & Conventions
- **TypeScript**: Use TypeScript for all new code with strict mode enabled
- **Naming Conventions**:
  - CamelCase for React components (`MyComponent`)
  - camelCase for functions and variables (`myFunction`)
  - UPPER_CASE for constants (`API_BASE_URL`)
- **File Organization**: Group related functionality in dedicated directories
- **JSDoc Comments**: Document all public functions and complex logic

#### Architecture Principles
- **Single Responsibility**: Each component/function should have one clear purpose
- **Separation of Concerns**: Keep UI, business logic, and data access separate
- **Error Boundaries**: Implement proper error handling at component boundaries
- **Performance First**: Consider performance implications of all changes

#### Testing Requirements
- Test with both historical and live data sources
- Ensure responsive design across all screen sizes
- Verify accessibility compliance (WCAG 2.1 AA)
- Test error scenarios and edge cases
- Validate API integration with rate limiting

### Local Development Setup

#### Advanced Development Features
```bash
# Enable debug mode for detailed logging
NEXT_PUBLIC_DEBUG_API=true npm run dev

# Run with bundle analysis
npm run build:analyze

# Test API connectivity
npm run test:apis

# Local GitHub Pages testing
npm run deploy:local
```

#### Development Tools Integration
- **VS Code**: Recommended with TypeScript and ESLint extensions
- **Chrome DevTools**: React Developer Tools for component debugging
- **Network Tab**: Monitor API calls and caching behavior
- **Performance Tab**: Analyze rendering performance and Core Web Vitals

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources & Links

### Documentation
- [API Integration Guide](./next-dashboard/API_INTEGRATION.md) - Comprehensive API setup
- [Data Source Feature](./next-dashboard/DATA_SOURCE_FEATURE.md) - Dynamic data switching
- [Chart Refresh Feature](./next-dashboard/CHART_REFRESH_FEATURE.md) - Manual refresh functionality
- [Data Status Pills](./next-dashboard/DATA_STATUS_PILLS_FEATURE.md) - Status indicators
- [Deployment Guide](./next-dashboard/GITHUB_DEPLOYMENT.md) - Detailed deployment instructions

### External Resources
- [Next.js Documentation](https://nextjs.org/docs) - Framework documentation
- [Chart.js Documentation](https://www.chartjs.org/docs/) - Visualization library
- [FRED API Documentation](https://fred.stlouisfed.org/docs/api/fred/) - Economic data API
- [BLS API Documentation](https://www.bls.gov/developers/api_signature_v2.htm) - Labor statistics
- [GitHub Pages Documentation](https://pages.github.com/) - Deployment platform

### Live Demo
**🌐 [View Live Dashboard](https://burntfrost.github.io/finance-factors/)**

---

**Built with ❤️ using Next.js 15, Chart.js, and real government data APIs**