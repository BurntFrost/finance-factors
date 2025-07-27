# Vercel Deployment Guide - Finance Factors Dashboard

This guide will help you deploy the Finance Factors Dashboard to Vercel with full API proxy functionality for live financial data.

## 🎯 Overview

Deploying to Vercel enables:
- ✅ **Live financial data** via API proxy
- ✅ **CORS-free API access** 
- ✅ **Secure API key management**
- ✅ **Automatic HTTPS and CDN**
- ✅ **Serverless functions** for data fetching

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Account**: Your repository should be on GitHub
3. **API Keys**: Get your free API keys from:
   - [FRED API](https://fred.stlouisfed.org/docs/api/api_key.html) (Federal Reserve)
   - [BLS API](https://www.bls.gov/developers/api_signature_v2.htm) (Bureau of Labor Statistics)
   - [Census API](https://api.census.gov/data/key_signup.html) (US Census Bureau)

## 🚀 Quick Deployment (Recommended)

### Option 1: Automated Script

```bash
# 1. Login to Vercel
npm run vercel:login

# 2. Set up environment variables
npm run setup:vercel

# 3. Deploy
npm run deploy:vercel
```

### Option 2: Manual Steps

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Set environment variables (see section below)
vercel env add FRED_API_KEY
vercel env add BLS_API_KEY
vercel env add CENSUS_API_KEY

# 4. Deploy
vercel --prod
```

## 🔑 Environment Variables Setup

### Required Variables (Server-side - Secure)

```bash
# Federal Reserve Economic Data
FRED_API_KEY=your_fred_api_key_here

# Bureau of Labor Statistics  
BLS_API_KEY=your_bls_api_key_here

# US Census Bureau
CENSUS_API_KEY=your_census_api_key_here
```

### Optional Variables

```bash
# Alpha Vantage (additional financial data)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
```

### Application Configuration (Auto-set by scripts)

```bash
NEXT_PUBLIC_DEFAULT_DATA_SOURCE=live-api
NEXT_PUBLIC_USE_API_PROXY=true
NEXT_PUBLIC_ENABLE_CACHING=true
```

## 🔧 Manual Environment Variables Setup

If you prefer to set environment variables manually:

1. **Via Vercel Dashboard**:
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add each variable for Production, Preview, and Development

2. **Via Vercel CLI**:
   ```bash
   # Set for all environments
   echo "your_api_key" | vercel env add FRED_API_KEY production
   echo "your_api_key" | vercel env add FRED_API_KEY preview  
   echo "your_api_key" | vercel env add FRED_API_KEY development
   ```

## 📊 Testing Your Deployment

### 1. Health Check
Visit: `https://your-app.vercel.app/api/proxy/health`

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "fred": {"configured": true, "status": "available"}
  }
}
```

### 2. Data Endpoint Test
```bash
curl -X POST https://your-app.vercel.app/api/proxy/data \
  -H "Content-Type: application/json" \
  -d '{"dataType":"house-prices"}'
```

### 3. Dashboard Test
- Visit your deployed dashboard
- Look for "🔴 Live API Data" indicators
- Charts should show "Source: Live API Data"

## 🛠️ Troubleshooting

### Common Issues

1. **"API key not found" errors**
   ```bash
   # Check environment variables
   npm run vercel:env
   
   # Or visit Vercel dashboard → Project → Settings → Environment Variables
   ```

2. **Build failures**
   ```bash
   # Test build locally first
   npm run build
   
   # Check build logs in Vercel dashboard
   npm run vercel:logs
   ```

3. **API proxy not working**
   - Verify environment variables are set for the correct environment
   - Check function logs in Vercel dashboard
   - Test health endpoint: `/api/proxy/health`

4. **CORS errors still occurring**
   - Ensure `NEXT_PUBLIC_USE_API_PROXY=true` is set
   - Check that API routes are deployed correctly
   - Verify the proxy endpoints return proper CORS headers

### Debug Commands

```bash
# Check who you're logged in as
vercel whoami

# List environment variables
npm run vercel:env

# View deployment logs
npm run vercel:logs

# Test API proxy locally
npm run test:proxy
```

## 🔄 Updating Your Deployment

```bash
# After making changes
git add .
git commit -m "Update dashboard"
git push

# Redeploy
vercel --prod
```

## 📈 Performance Optimization

Your Vercel deployment includes:

- **Edge Caching**: API responses cached for 15 minutes
- **CDN Distribution**: Global content delivery
- **Automatic Compression**: Gzip/Brotli compression
- **Image Optimization**: Next.js image optimization
- **Code Splitting**: Automatic bundle optimization

## 🔒 Security Features

- **Server-side API Keys**: Never exposed to browsers
- **HTTPS Everywhere**: Automatic SSL certificates
- **Rate Limiting**: Built-in API request limiting
- **CORS Protection**: Proper cross-origin headers
- **Environment Isolation**: Separate configs for prod/preview/dev

## 📱 Custom Domain (Optional)

1. **Add Domain in Vercel**:
   - Go to Project Settings → Domains
   - Add your custom domain

2. **Update DNS**:
   - Point your domain to Vercel's servers
   - Follow Vercel's DNS configuration guide

## 🎉 Success Checklist

After deployment, verify:

- [ ] Dashboard loads at your Vercel URL
- [ ] Health check returns `"status": "healthy"`
- [ ] Charts show "Live API Data" indicators  
- [ ] No CORS errors in browser console
- [ ] API proxy endpoints respond correctly
- [ ] Environment variables are set properly

## 📞 Support

If you encounter issues:

1. **Check Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
2. **Review Function Logs**: Vercel Dashboard → Functions → View Logs
3. **Test Locally**: Use `vercel dev` to test locally
4. **API Status**: Check external API status pages

---

**🎊 Congratulations!** Your Finance Factors Dashboard is now deployed with full live data functionality!
