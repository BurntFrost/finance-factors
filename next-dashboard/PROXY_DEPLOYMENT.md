# API Proxy Deployment Guide

This guide explains how to deploy the finance-factors dashboard with the API proxy solution to enable live data functionality.

## 🎯 Overview

The API proxy solves CORS (Cross-Origin Resource Sharing) issues that prevent browsers from directly accessing external financial APIs. By using Vercel serverless functions, we can:

- ✅ Bypass browser CORS restrictions
- 🔒 Keep API keys secure on the server-side
- ⚡ Enable true live data functionality
- 🚀 Deploy easily to Vercel with zero configuration

## 🏗️ Architecture

```
Browser → Vercel Serverless Function → External APIs (FRED, BLS, etc.)
```

**Before (CORS blocked):**
```
Browser → ❌ CORS Error → External APIs
```

**After (Proxy enabled):**
```
Browser → ✅ Proxy API → External APIs
```

## 🚀 Quick Deployment

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Set Environment Variables

In your Vercel dashboard or via CLI:

```bash
# Server-side API keys (secure)
vercel env add FRED_API_KEY
vercel env add BLS_API_KEY  
vercel env add CENSUS_API_KEY
vercel env add ALPHA_VANTAGE_API_KEY
```

### 4. Deploy

```bash
npm run deploy:vercel
```

## 🔧 Local Development

### 1. Start Vercel Dev Server

```bash
npm run dev:vercel
```

This starts both Next.js and the Vercel serverless functions locally.

### 2. Test the Proxy

```bash
npm run test:proxy
```

### 3. Test Specific Data Sources

```bash
npm run test:house-prices
```

## 📋 Environment Variables

### Required Server-side Variables (Secure)

```bash
FRED_API_KEY=your_fred_api_key_here
BLS_API_KEY=your_bls_api_key_here
CENSUS_API_KEY=your_census_api_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
```

### Optional Client-side Variables (Fallback)

```bash
NEXT_PUBLIC_FRED_API_KEY=your_fred_api_key_here
NEXT_PUBLIC_BLS_API_KEY=your_bls_api_key_here
NEXT_PUBLIC_CENSUS_API_KEY=your_census_api_key_here
NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
```

### Configuration Variables

```bash
NEXT_PUBLIC_DEFAULT_DATA_SOURCE=live-api
NEXT_PUBLIC_USE_API_PROXY=true
NEXT_PUBLIC_ENABLE_CACHING=true
NEXT_PUBLIC_DEBUG_API=false
```

## 🧪 Testing

### Health Check

Visit: `https://your-app.vercel.app/api/proxy/health`

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "fred": { "configured": true, "status": "available" },
    "bls": { "configured": true, "status": "unknown" }
  }
}
```

### Data Endpoint

POST to: `https://your-app.vercel.app/api/proxy/data`

Request body:
```json
{
  "dataType": "house-prices",
  "useCache": true
}
```

Expected response:
```json
{
  "success": true,
  "data": [
    { "date": "2024-01-01", "value": 327.5, "label": "2024" }
  ],
  "source": "FRED API",
  "timestamp": "2025-01-27T12:00:00.000Z"
}
```

## 🔍 Troubleshooting

### Common Issues

1. **"API key not found" errors**
   - Check environment variables in Vercel dashboard
   - Ensure variables are set for the correct environment (production/preview)

2. **CORS errors still occurring**
   - Verify `NEXT_PUBLIC_USE_API_PROXY=true` is set
   - Check that the proxy endpoints are deployed correctly

3. **Rate limit exceeded**
   - The proxy includes built-in rate limiting
   - Check the health endpoint for rate limit status

4. **Proxy not responding**
   - Check Vercel function logs in the dashboard
   - Verify the API endpoints are accessible

### Debug Steps

1. **Check proxy health:**
   ```bash
   curl https://your-app.vercel.app/api/proxy/health
   ```

2. **Test data endpoint:**
   ```bash
   curl -X POST https://your-app.vercel.app/api/proxy/data \
     -H "Content-Type: application/json" \
     -d '{"dataType":"house-prices"}'
   ```

3. **Check Vercel logs:**
   ```bash
   vercel logs
   ```

## 📊 Supported Data Sources

Currently implemented:
- ✅ **FRED API**: House prices, interest rates, GDP, unemployment, inflation
- 🚧 **BLS API**: Employment data, wages (planned)
- 🚧 **Census API**: Demographics, housing data (planned)
- 🚧 **Alpha Vantage**: Additional economic indicators (planned)

## 🔒 Security Features

- **Server-side API keys**: Never exposed to the browser
- **Rate limiting**: Built-in protection against API quota exhaustion
- **CORS headers**: Properly configured for browser security
- **Input validation**: Request parameters are validated
- **Error handling**: Graceful degradation with fallback data

## 🚀 Performance Features

- **Caching**: 15-minute response caching to reduce API calls
- **Request deduplication**: Multiple requests for same data are merged
- **Timeout handling**: 30-second timeout with proper error messages
- **Retry logic**: Automatic retries with exponential backoff

## 📈 Monitoring

### Vercel Dashboard

- Function invocations
- Error rates
- Response times
- Bandwidth usage

### Built-in Logging

All API requests are logged with:
- Provider (FRED, BLS, etc.)
- Data type requested
- Success/failure status
- Response time
- Error details

## 🔄 Fallback Strategy

The system uses a multi-layer fallback approach:

1. **Primary**: API Proxy (server-side)
2. **Secondary**: Direct API calls (client-side, will fail due to CORS)
3. **Tertiary**: Historical sample data (always works)

This ensures the dashboard always displays data, even if the proxy is unavailable.

## 📝 Next Steps

1. **Deploy to Vercel** using the steps above
2. **Test live data** in your browser
3. **Monitor performance** via Vercel dashboard
4. **Expand to other APIs** (BLS, Census, Alpha Vantage)
5. **Add custom data sources** as needed

## 🤝 Contributing

To add support for additional APIs:

1. Create a new service in `api/services/`
2. Add endpoint configuration to `api/types/proxy.ts`
3. Update the main proxy handler in `api/proxy/data.ts`
4. Add tests and documentation

---

**Need help?** Check the troubleshooting section or create an issue in the repository.
