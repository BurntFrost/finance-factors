# Finance Factors Dashboard - Deployment Guide

## Deployment Options Overview

The Finance Factors Dashboard supports two deployment strategies:

1. **Vercel Deployment** (Recommended) - Full API functionality with serverless functions
2. **GitHub Pages Deployment** (Backup) - Static deployment with historical data fallback

## Option 1: Vercel Deployment (Recommended) ✅

**Full API functionality with automatic deployment on every push to main branch.**

### Benefits
- ✅ **Full API Functionality**: Server-side API proxy with secure key management
- ✅ **Automatic Deployment**: Push to main triggers production deployment
- ✅ **Performance Optimized**: Edge caching, CDN, and serverless functions
- ✅ **Real-time Data**: Live government APIs with intelligent caching
- ✅ **CORS-Free**: No browser CORS restrictions
- ✅ **Secure**: API keys stored server-side

### Quick Setup

#### Prerequisites
- Vercel account at [vercel.com](https://vercel.com)
- GitHub repository
- API keys from government data sources

#### Step 1: Initial Vercel Setup (One-time)

```bash
cd next-dashboard

# 1. Install Vercel CLI (if not already installed)
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Create and link Vercel project
vercel --prod
```

Follow the prompts:
- **Set up and deploy**: Yes
- **Which scope**: Choose your account/team
- **Link to existing project**: No (create new)
- **Project name**: `finance-factors` (or your preferred name)
- **Directory**: `./` (current directory)
- **Override settings**: No

#### Step 2: Configure Environment Variables

**Option A: Using the setup script (Recommended)**
```bash
cd next-dashboard
./setup-vercel-env.sh
```

**Option B: Manual setup via Vercel Dashboard**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables for **Production**, **Preview**, and **Development**:

```
FRED_API_KEY=your_fred_api_key_here
BLS_API_KEY=your_bls_api_key_here  
CENSUS_API_KEY=your_census_api_key_here
```

**Option C: Using Vercel CLI**
```bash
cd next-dashboard

# Set environment variables for all environments
echo "your_fred_api_key" | vercel env add FRED_API_KEY production
echo "your_fred_api_key" | vercel env add FRED_API_KEY preview
echo "your_fred_api_key" | vercel env add FRED_API_KEY development

echo "your_bls_api_key" | vercel env add BLS_API_KEY production
echo "your_bls_api_key" | vercel env add BLS_API_KEY preview
echo "your_bls_api_key" | vercel env add BLS_API_KEY development

echo "your_census_api_key" | vercel env add CENSUS_API_KEY production
echo "your_census_api_key" | vercel env add CENSUS_API_KEY preview
echo "your_census_api_key" | vercel env add CENSUS_API_KEY development
```

#### Step 3: Deploy

```bash
# Manual deployment
vercel --prod

# Or push to main branch for automatic deployment
git add .
git commit -m "Deploy with full API functionality"
git push origin main
```

#### Step 4: Verify Deployment

After deployment completes:
1. Visit your Vercel deployment URL
2. Test API endpoints:
   - `https://your-app.vercel.app/api/proxy/health`
   - `https://your-app.vercel.app/api/proxy/data?source=fred&series=MSPUS`
3. Check dashboard shows "🔴 Live API Data" indicators

### Automatic Deployment (Git Integration)

If you have Git integration configured, every push to main automatically triggers deployment:

```bash
# Make changes and push
git add .
git commit -m "Update dashboard features"
git push origin main
```

**Monitor deployment:**
1. Check Vercel dashboard for deployment status
2. Verify API functionality after deployment
3. Monitor performance and error logs

## Option 2: GitHub Pages Deployment (Backup)

**Static deployment with client-side API calls and historical data fallback.**

### Benefits
- ✅ **Zero Configuration**: No secrets or tokens required
- ✅ **Static Hosting**: Fast loading with GitHub's CDN
- ✅ **Fallback Option**: Works when Vercel isn't available
- ✅ **Historical Data**: Reliable sample data for demonstrations

### Quick Setup (2 Steps)

#### Step 1: Enable GitHub Pages
1. Go to your repository **Settings**
2. Scroll to **Pages** section
3. Under **Source**, select **GitHub Actions**

#### Step 2: Push to Deploy
```bash
git add .
git commit -m "Deploy static version"
git push origin main
```

**That's it!** Your dashboard will be live at: `https://yourusername.github.io/finance-factors`

### Configuration Details

The deployment is handled by `.github/workflows/deploy.yml` which:
- ✅ Builds the Next.js app with embedded API keys
- ✅ Optimizes for static deployment
- ✅ Handles GitHub Pages configuration automatically
- ✅ Caches dependencies for faster builds

### API Keys for GitHub Pages

The API keys are embedded in the deployment workflow:
- **FRED**: `d45d9655ab79981088aa17b30a0c741b` ✅
- **BLS**: `81277313b0e141148d59fa83125510de` ✅  
- **Census**: `e0d9fd6f239294efa560fd5b8d382d6978439e7b` ✅

**Note**: Keys are public in browser anyway, so no GitHub Secrets needed.

## Deployment Timeline

- **Push code**: Instant
- **Build starts**: ~30 seconds
- **Build completes**: ~3 minutes
- **Site live**: ~5 minutes total

## Manual Build Options

```bash
npm run build              # Standard build
npm run build:github       # Build for GitHub Pages
npm run deploy:local       # Test locally with serve
npm run build:analyze      # Build with bundle analysis
```

## Troubleshooting

### Common Issues

#### Vercel Deployment Issues

**❌ "VERCEL_TOKEN is not set"**
- Add the token to GitHub repository secrets
- Ensure token has correct permissions

**❌ "Project not found"**
- Verify `VERCEL_PROJECT_ID` in GitHub secrets
- Check `VERCEL_ORG_ID` is correct

**❌ "Environment variables not found"**
- Run `./setup-vercel-env.sh` to configure API keys
- Or add them manually in Vercel dashboard

**❌ "API endpoints returning 500"**
- Check API keys are valid in Vercel dashboard
- Verify environment variables are set for production

#### GitHub Pages Issues

**❌ Build Fails**
- Check Actions log for specific errors
- Verify API keys are correctly embedded in workflow
- Ensure no syntax errors in code

**❌ Site Not Loading**
- Wait 5-10 minutes for DNS propagation
- Check GitHub Pages settings are correct
- Try hard refresh (Ctrl+F5 or Cmd+Shift+R)

**❌ API Data Not Loading**
- Expected behavior for GitHub Pages (CORS limitations)
- Dashboard should show historical data instead
- Check browser console for CORS errors (expected)

### Debug Commands

```bash
# Check Vercel setup status
npm run verify:vercel

# Check Vercel project info
vercel ls

# View environment variables
vercel env ls

# Check deployment logs
vercel logs

# Test API endpoints locally
npm run test:proxy

# Test GitHub Pages build locally
npm run deploy:local
```

## Performance Optimization

### Vercel Optimizations
- **Edge Caching**: 15-minute API response cache
- **Global CDN**: Worldwide distribution
- **Serverless Functions**: Auto-scaling with demand
- **Compression**: Automatic gzip compression

### GitHub Pages Optimizations
- **Static Assets**: Optimized bundle sizes
- **CDN**: GitHub's global CDN
- **Caching**: Browser caching for static resources
- **Lazy Loading**: Chart components loaded on-demand

## Security Considerations

### Vercel Security
- **Server-side API Keys**: Keys never exposed to browser
- **HTTPS**: Automatic SSL certificates
- **Environment Isolation**: Separate environments for dev/preview/prod
- **Rate Limiting**: Built-in request throttling

### GitHub Pages Security
- **Public API Keys**: Keys visible in browser (acceptable for free government APIs)
- **HTTPS**: Automatic SSL via GitHub Pages
- **Static Content**: No server-side vulnerabilities
- **Rate Monitoring**: Monitor API usage dashboards

## Monitoring & Maintenance

### Vercel Monitoring
- **Analytics**: Built-in performance analytics
- **Error Tracking**: Automatic error logging
- **Function Logs**: Serverless function monitoring
- **Performance**: Core Web Vitals tracking

### GitHub Pages Monitoring
- **Actions**: Build status in GitHub Actions
- **Pages**: Deployment status in repository settings
- **Analytics**: Optional Google Analytics integration
- **Uptime**: GitHub's infrastructure reliability

## Success Indicators

When everything is working correctly:

### Vercel Success
1. **Vercel Dashboard**: ✅ New deployment appears with "Ready" status
2. **API Health**: ✅ `https://your-app.vercel.app/api/proxy/health` returns 200
3. **Data Endpoint**: ✅ `https://your-app.vercel.app/api/proxy/data?source=fred&series=MSPUS` returns data
4. **Dashboard**: ✅ Live data indicators show "🔴 Live API Data"

### GitHub Pages Success
1. **GitHub Actions**: ✅ "Deploy to GitHub Pages" workflow completes successfully
2. **Site Access**: ✅ `https://yourusername.github.io/finance-factors` loads
3. **Dashboard**: ✅ Charts display with "📊 Historical Data" indicators
4. **Functionality**: ✅ All interactive features work correctly

## Next Steps

After successful deployment:
1. **Monitor Performance**: Check analytics and error rates
2. **Update API Keys**: Rotate keys periodically for security
3. **Scale Resources**: Upgrade Vercel plan if needed for higher limits
4. **Gather Feedback**: Collect user feedback for improvements
5. **Regular Updates**: Keep dependencies and data sources current

Your Finance Factors Dashboard is now deployed and ready to provide real-time financial insights! 🎉
