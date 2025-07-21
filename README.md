# Finance Factors Dashboard

A comprehensive Next.js 15 dashboard application for visualizing real-time financial and economic data with interactive Chart.js visualizations, featuring live API integration and dynamic data source management.

## 🌟 Key Features

### Real Financial Data Integration
- **Live Government APIs**: FRED, BLS, Census Bureau, and Alpha Vantage integration
- **Real-time Data**: Housing prices, employment data, economic indicators, and market trends
- **Smart Fallbacks**: Graceful degradation to sample data when APIs are unavailable
- **Data Status Indicators**: Visual pills showing data freshness and authenticity

### Interactive User Experience
- **Dynamic Data Source Switching**: Toggle between sample data and live APIs with card flip animations
- **Chart Refresh Functionality**: Manual refresh with visual feedback and smooth animations
- **Responsive Design**: Optimized for desktop, tablet, and mobile viewing
- **Accessibility**: Full keyboard navigation and screen reader support

### Performance & Deployment
- **GitHub Pages Ready**: Zero-configuration deployment with automated CI/CD (uses sample data)
- **Performance Optimized**: Lazy loading, code splitting, and intelligent caching
- **Web Vitals Monitoring**: Built-in performance tracking and optimization
- **Static Export**: Optimized for fast loading and SEO
- **CORS Handling**: Smart error handling for API limitations in static deployments

## 📊 Available Data Sources

### Live APIs (Free Government Data)
> **Note**: Live APIs require proper server setup due to CORS restrictions. GitHub Pages deployment uses sample data by default.

| Data Type | Primary Source | Description | Update Frequency |
|-----------|----------------|-------------|------------------|
| House Prices | FRED API | Case-Shiller Home Price Index | Monthly |
| Employment Data | BLS API | Average hourly earnings, unemployment | Monthly |
| Economic Indicators | FRED API | GDP, interest rates, inflation | Quarterly/Monthly |
| Demographics | Census Bureau | Population, income statistics | Annual |
| Market Data | Alpha Vantage | Additional economic indicators | Daily |

### Sample Data (Default for GitHub Pages)
- Realistic financial trends with volatility and seasonal patterns
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

## 🏗 Architecture & Project Structure

### Component Architecture
```
DataSourceProvider (Context)
├── DataSourceSelector (UI Component)
├── Page Components
│   ├── LazyChart (data source aware)
│   ├── DynamicChart (data source aware)
│   ├── DataStatusPill (status indicators)
│   └── DynamicElementRenderer
└── Services Layer
    ├── realApiService (API orchestrator)
    ├── fredApiService (FRED API client)
    ├── blsApiService (BLS API client)
    ├── censusApiService (Census API client)
    └── mockApiService (development/testing)
```

### Project Structure
```
next-dashboard/
├── app/
│   ├── components/
│   │   ├── LazyChart.tsx           # Lazy-loaded chart component
│   │   ├── DataSourceSelector.tsx  # Data source toggle UI
│   │   ├── DataStatusPill.tsx      # Data freshness indicators
│   │   └── ChartRegistration.tsx   # Chart.js registration
│   ├── context/
│   │   └── DataSourceContext.tsx   # Global state management
│   ├── hooks/
│   │   └── useDataSource.ts        # Custom data hooks
│   ├── services/
│   │   ├── realApiService.ts       # Live API integration
│   │   └── mockApiService.ts       # Sample data service
│   ├── layout.tsx                  # Root layout with optimizations
│   ├── page.tsx                    # Main dashboard page
│   └── globals.css                 # Global styles
├── .github/workflows/
│   └── deploy.yml                  # GitHub Pages deployment
├── next.config.ts                  # Next.js configuration
└── package.json                    # Dependencies and scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (Node.js 20+ recommended)
- npm, yarn, or pnpm package manager

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
   # Copy environment template
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

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run build:github` - Build for GitHub Pages deployment
- `npm run build:analyze` - Build with bundle analysis
- `npm run deploy:local` - Test GitHub Pages build locally
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test:apis` - Test API connectivity

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

- **Sample Data Mode**: Generated realistic financial data for development
- **Live API Mode**: Real government data with automatic fallbacks
- **Persistent Preferences**: User selections saved in localStorage
- **Health Monitoring**: Visual indicators for API status and data freshness

## 🚀 GitHub Pages Deployment

### Super Simple Deployment (2 Steps)

**No secrets needed!** API keys are embedded in the build since they're public anyway.

#### Step 1: Enable GitHub Pages
1. Go to repository **Settings**
2. Scroll to **Pages** section
3. Under **Source**, select **GitHub Actions**

#### Step 2: Push to Deploy
```bash
git add .
git commit -m "Deploy with live API data"
git push origin main
```

**That's it!** Your dashboard will be live at: `https://yourusername.github.io/finance-factors`

### What You Get
✅ **Real Financial Data**: Live housing prices, employment data, economic indicators
✅ **Government APIs**: FRED, BLS, Census Bureau data
✅ **Interactive Features**: Data source switching, chart refresh, hover effects
✅ **Mobile Responsive**: Works on all devices
✅ **Auto Updates**: Redeploys on every push to main branch
✅ **Performance Optimized**: Fast loading with intelligent caching

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

## 🎯 Key Features Deep Dive

### Interactive Data Source Management
- **Dynamic Switching**: Toggle between sample data and live APIs with visual feedback
- **Persistent Preferences**: User selections saved across browser sessions
- **Health Monitoring**: Real-time API status indicators with color-coded pills
- **Smart Fallbacks**: Automatic fallback to cached or sample data when APIs fail

### Chart Refresh & Interactivity
- **Manual Refresh**: Click-to-refresh functionality with spinning animations
- **Auto-refresh**: Optional automatic data updates at configurable intervals
- **Smooth Animations**: Chart.js integration with 750ms easing transitions
- **Loading States**: Skeleton loaders and progress indicators during data fetching

### Data Status Indicators
- **🟢 Live Data**: Recently updated real data with timestamps
- **🔶 Sample Data**: Demo data for development and testing
- **🔴 Outdated**: Real data that may need refreshing
- **⏳ Loading**: Data currently being fetched

### Performance Optimizations
- **Lazy Loading**: Chart components loaded on-demand
- **Code Splitting**: Separate chunks for React, Chart.js, and application code
- **Intelligent Caching**: 30-minute cache for API responses with request deduplication
- **Bundle Analysis**: Built-in webpack bundle analyzer (`npm run build:analyze`)

## 🔧 Configuration & Environment Variables

### Development Configuration
```bash
# .env.local (for development)
NEXT_PUBLIC_DEFAULT_DATA_SOURCE=sample          # or 'live-api'
NEXT_PUBLIC_FRED_API_KEY=your_fred_key
NEXT_PUBLIC_BLS_API_KEY=your_bls_key
NEXT_PUBLIC_CENSUS_API_KEY=your_census_key
NEXT_PUBLIC_DEBUG_API=true                      # Enable API debug logging
```

### Production Configuration
```bash
# Environment variables for GitHub Pages (embedded in workflow)
NEXT_PUBLIC_DEFAULT_DATA_SOURCE=live-api
NEXT_PUBLIC_ENABLE_CACHING=true
NEXT_PUBLIC_DEBUG_API=false
```

### Next.js Configuration Highlights
- **Static Export**: Enabled for GitHub Pages compatibility
- **Asset Optimization**: Dynamic base path handling for repository deployments
- **Webpack Optimizations**: Custom chunk splitting for optimal caching
- **Performance**: Compression enabled, image optimization configured

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

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**: Follow the existing code style and patterns
4. **Add tests**: Ensure new features are tested
5. **Commit changes**: `git commit -m 'Add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Submit a pull request**: Describe your changes and their benefits

### Development Guidelines
- Use TypeScript for all new code
- Follow existing naming conventions (CamelCase for components, snake_case for utilities)
- Add JSDoc comments for public functions
- Ensure responsive design for all UI changes
- Test with both sample and live data sources

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