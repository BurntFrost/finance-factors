# Finance Factors Dashboard - Development Guide

## Quick Start

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

3. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

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

## API Integration

### Supported APIs (All Free Government Data)

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

#### Development Configuration
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

## Project Structure

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
├── api/                            # API Proxy (Vercel Functions)
│   ├── proxy/                      # API proxy endpoints
│   ├── services/                   # Server-side services
│   ├── types/                      # API type definitions
│   └── utils/                      # API utilities
├── scripts/                        # Build & Development Scripts
│   └── test-apis.js                # API connectivity testing
├── next.config.ts                  # Next.js configuration & optimizations
├── package.json                    # Dependencies & npm scripts
├── tsconfig.json                   # TypeScript configuration
└── vercel.json                     # Vercel deployment configuration
```

## Development Workflow

### 1. **Feature Development**

1. **Create feature branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Develop with hot reload**:
   ```bash
   npm run dev
   ```

3. **Test functionality**:
   ```bash
   npm run test:apis
   npm run lint
   ```

4. **Build and test**:
   ```bash
   npm run build
   npm run start
   ```

### 2. **Adding New Data Sources**

1. **Update types** in `types/dashboard.ts`:
   ```typescript
   type DataSourceType = 'historical' | 'live-api' | 'new-source';
   ```

2. **Add configuration** in `config/apiConfig.ts`:
   ```typescript
   export const NEW_SOURCE_CONFIG = {
     name: 'New Data Source',
     baseUrl: 'https://api.example.com',
     apiKey: process.env.NEXT_PUBLIC_NEW_API_KEY,
     rateLimit: 1000,
   };
   ```

3. **Implement data transformer**:
   ```typescript
   export const transformNewSourceData = (rawData: any): ChartData => {
     return {
       labels: rawData.dates,
       datasets: [{
         label: 'New Data',
         data: rawData.values,
         borderColor: 'rgb(75, 192, 192)',
       }]
     };
   };
   ```

### 3. **Custom Chart Components**

```typescript
import { AutomaticChart } from './components/AutomaticChart';

const CustomChart = () => {
  return (
    <AutomaticChart
      dataType="custom-data"
      chartType="line"
      title="Custom Chart"
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

## Testing & Debugging

### API Connectivity Testing

```bash
# Test all APIs
npm run test:apis

# Test specific API
node scripts/test-house-prices.js
```

### Debug Mode

Enable detailed logging:
```bash
# In .env.local
NEXT_PUBLIC_DEBUG_API=true
```

This logs all API requests and responses to browser console.

### Common Issues & Solutions

#### Build Fails
- Check Actions log for specific errors
- Verify all dependencies in package.json are compatible
- Run `npm run lint` to check for code issues
- Ensure API keys are valid (though not required for build)

#### API Data Not Loading
- Check browser console for API errors
- Test APIs locally with `npm run test:apis`
- Verify API keys are valid and not expired
- Check if API rate limits have been exceeded

#### Charts Not Displaying
- Check browser console for Chart.js errors
- Verify data matches expected ChartData interface
- Test in different browsers (Chrome, Firefox, Safari)
- Check network tab for failed resource requests

### Performance Optimization

#### Bundle Analysis
```bash
npm run build:analyze
```

#### Development Tools Integration
- **VS Code**: Recommended with TypeScript and ESLint extensions
- **Chrome DevTools**: React Developer Tools for component debugging
- **Network Tab**: Monitor API calls and caching behavior
- **Performance Tab**: Analyze rendering performance and Core Web Vitals

## Contributing Guidelines

### Code Style & Conventions
- **TypeScript**: Use TypeScript for all new code with strict mode enabled
- **Naming Conventions**:
  - CamelCase for React components (`MyComponent`)
  - camelCase for functions and variables (`myFunction`)
  - UPPER_CASE for constants (`API_BASE_URL`)
- **File Organization**: Group related functionality in dedicated directories
- **JSDoc Comments**: Document all public functions and complex logic

### Architecture Principles
- **Single Responsibility**: Each component/function should have one clear purpose
- **Separation of Concerns**: Keep UI, business logic, and data access separate
- **Error Boundaries**: Implement proper error handling at component boundaries
- **Performance First**: Consider performance implications of all changes

### Testing Requirements
- Test with both historical and live data sources
- Ensure responsive design across all screen sizes
- Verify accessibility compliance (WCAG 2.1 AA)
- Test error scenarios and edge cases
- Validate API integration with rate limiting

## Browser Support & Accessibility

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

This development guide provides everything needed to contribute to and extend the Finance Factors Dashboard effectively.
