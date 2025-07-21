# API Integration Guide

This document explains how to integrate real financial and economic data APIs into the Finance Factors dashboard.

## ⚠️ Important: CORS and Deployment Considerations

**For GitHub Pages deployment**: The app defaults to sample data to avoid CORS issues. Live APIs require a proper server setup.

**For local development or server deployment**: Follow the setup below to use live APIs.

## 🚀 Quick Start (Local Development)

1. **Copy environment file**:
   ```bash
   cp .env.example .env.local
   ```

2. **Get a FRED API key** (recommended first step):
   - Visit: https://fred.stlouisfed.org/docs/api/api_key.html
   - Create free account and request API key
   - Add to `.env.local`: `NEXT_PUBLIC_FRED_API_KEY=your_key_here`

3. **Enable live data** (only for local development or proper server deployment):
   ```bash
   # In .env.local
   NEXT_PUBLIC_DEFAULT_DATA_SOURCE=live-api
   ```

4. **Restart development server**:
   ```bash
   npm run dev
   ```

## 🌐 GitHub Pages Deployment

The current GitHub Pages deployment uses sample data by default because:
- External APIs don't allow direct browser requests (CORS policy)
- GitHub Pages only serves static files (no server-side API proxying)

See `CORS_AND_API_SETUP.md` for detailed solutions.

## 📊 Supported APIs

### 1. FRED API (Federal Reserve Economic Data)
- **Provider**: Federal Reserve Bank of St. Louis
- **Cost**: Free
- **Rate Limit**: 120 requests/minute
- **Data**: Housing prices, interest rates, GDP, unemployment, inflation
- **Setup**: https://fred.stlouisfed.org/docs/api/api_key.html

**Available Data Types**:
- House prices (Case-Shiller Index)
- Federal funds rate
- Unemployment rate
- GDP growth
- Treasury yields

### 2. BLS API (Bureau of Labor Statistics)
- **Provider**: U.S. Bureau of Labor Statistics
- **Cost**: Free
- **Rate Limit**: 25 requests/day (no key), 500 requests/day (with key)
- **Data**: Employment, wages, inflation, labor statistics
- **Setup**: https://www.bls.gov/developers/api_signature_v2.htm

**Available Data Types**:
- Average hourly earnings
- Consumer Price Index
- Unemployment statistics
- Labor force participation

### 3. Census Bureau API
- **Provider**: U.S. Census Bureau
- **Cost**: Free
- **Rate Limit**: No strict limits
- **Data**: Demographics, housing, income statistics
- **Setup**: https://api.census.gov/data/key_signup.html (optional)

**Available Data Types**:
- Median home values
- Household income
- Population demographics
- Housing statistics

### 4. Alpha Vantage API (Optional)
- **Provider**: Alpha Vantage Inc.
- **Cost**: Free tier (25 requests/day), Premium plans available
- **Rate Limit**: 5 requests/minute (free tier)
- **Data**: Economic indicators, stock data
- **Setup**: https://www.alphavantage.co/support/#api-key

## 🔧 Configuration

### Environment Variables

```bash
# Required for housing price data
NEXT_PUBLIC_FRED_API_KEY=your_fred_key

# Required for employment/wage data  
NEXT_PUBLIC_BLS_API_KEY=your_bls_key

# Optional for demographic data
NEXT_PUBLIC_CENSUS_API_KEY=your_census_key

# Optional for additional indicators
NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key

# Set default data source
# Use 'sample' for GitHub Pages, 'live-api' for server deployments
NEXT_PUBLIC_DEFAULT_DATA_SOURCE=sample
```

### Data Source Priority

The system automatically selects the best API for each data type:

- **House Prices**: FRED (primary) → Census (fallback)
- **Income Data**: BLS (primary) → Census (fallback)  
- **Interest Rates**: FRED (primary) → Alpha Vantage (fallback)
- **Economic Indicators**: FRED (primary) → Alpha Vantage (fallback)

## 🏗️ Architecture

### Service Layer

```
realApiService.ts          # Main orchestrator
├── fredApiService.ts       # FRED API client
├── blsApiService.ts        # BLS API client  
├── censusApiService.ts     # Census API client
└── alphaVantageApiService.ts # Alpha Vantage client
```

### Data Flow

1. **Request**: Component requests data via `useDataSource` hook
2. **Routing**: `realApiService` routes to appropriate API service
3. **Fetching**: Individual service fetches and transforms data
4. **Caching**: Response cached for 30 minutes
5. **Fallback**: If API fails, falls back to mock data
6. **Transform**: Data transformed to standard format for charts

### Error Handling

- **Rate Limiting**: Automatic rate limit tracking per API
- **Retry Logic**: Exponential backoff for transient failures
- **Fallback**: Graceful degradation to mock data
- **Caching**: Reduces API calls and improves reliability

## 📈 Data Types and Sources

| Data Type | Primary API | Series ID | Description |
|-----------|-------------|-----------|-------------|
| House Prices | FRED | CSUSHPISA | Case-Shiller U.S. National Home Price Index |
| Salary Income | BLS | CES0500000003 | Average Hourly Earnings |
| Cost of Living | BLS | CUUR0000SA0 | Consumer Price Index |
| Interest Rates | FRED | FEDFUNDS | Federal Funds Rate |
| Unemployment | FRED | UNRATE | Unemployment Rate |
| GDP Growth | FRED | GDP | Gross Domestic Product |

## 🔍 Monitoring and Health Checks

### API Health Status Component

```tsx
import ApiHealthStatus from './components/ApiHealthStatus';

// Show compact status
<ApiHealthStatus />

// Show detailed status
<ApiHealthStatus showDetails={true} />
```

### Health Check Methods

```typescript
// Check all APIs
const status = await realApiService.getHealthStatus();

// Get available data types
const dataTypes = realApiService.getAvailableDataTypes();

// Clear caches
realApiService.clearCache();
```

## 🚨 Troubleshooting

### Common Issues

1. **"No APIs configured"**
   - Check `.env.local` file exists
   - Verify API keys are set correctly
   - Restart development server

2. **"Rate limit exceeded"**
   - Wait for rate limit reset
   - Consider upgrading to paid API tiers
   - Check for excessive requests in code

3. **"API unavailable"**
   - Check internet connection
   - Verify API key validity
   - Check API service status pages

4. **Data not updating**
   - Clear browser cache
   - Check API cache settings
   - Verify data source is set to 'live-api'

### Debug Mode

Enable debug logging:

```bash
# In .env.local
NEXT_PUBLIC_DEBUG_API=true
```

This will log all API requests and responses to the browser console.

## 🔒 Security Considerations

### API Key Security

- **Client-side exposure**: API keys are exposed in client-side code
- **Rate limiting**: Use API keys to get higher rate limits
- **Domain restrictions**: Some APIs support domain restrictions
- **Monitoring**: Monitor API usage for unusual activity

### Best Practices

1. **Use environment variables** for all API keys
2. **Never commit** API keys to version control
3. **Monitor usage** to detect abuse
4. **Implement caching** to reduce API calls
5. **Use HTTPS** for all API requests

## 📊 Performance Optimization

### Caching Strategy

- **Memory cache**: 30-minute cache for API responses
- **Request deduplication**: Prevent duplicate simultaneous requests
- **Lazy loading**: Load data only when needed
- **Background refresh**: Update cache in background

### Rate Limit Management

- **Per-API tracking**: Separate rate limits for each API
- **Exponential backoff**: Intelligent retry logic
- **Queue management**: Queue requests when rate limited
- **Fallback data**: Use mock data when APIs unavailable

## 🚀 Deployment

### GitHub Pages

The dashboard is optimized for GitHub Pages deployment:

1. All API calls are client-side compatible
2. No server-side API proxy required
3. Environment variables work with static builds
4. CORS is handled by the APIs themselves

### Environment Setup

```bash
# Production environment variables
NEXT_PUBLIC_FRED_API_KEY=prod_fred_key
NEXT_PUBLIC_BLS_API_KEY=prod_bls_key
NEXT_PUBLIC_DEFAULT_DATA_SOURCE=live-api
```

## 📚 Additional Resources

- [FRED API Documentation](https://fred.stlouisfed.org/docs/api/fred/)
- [BLS API Documentation](https://www.bls.gov/developers/api_signature_v2.htm)
- [Census API Documentation](https://www.census.gov/data/developers/data-sets.html)
- [Alpha Vantage Documentation](https://www.alphavantage.co/documentation/)

## 🤝 Contributing

When adding new APIs:

1. Create service file in `services/` directory
2. Add API configuration to `types/dataSource.ts`
3. Update `realApiService.ts` routing
4. Add environment variables to `.env.example`
5. Update this documentation
