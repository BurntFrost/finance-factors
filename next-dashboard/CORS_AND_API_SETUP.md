# CORS Issues and API Setup Guide

## 🚨 Current Issue: CORS Errors on GitHub Pages

The console errors you're seeing are **expected behavior** for the current GitHub Pages deployment:

```
Error: Preflight response is not successful. Status code: 405
Error: Origin https://burntfrost.github.io is not allowed by Access-Control-Allow-Origin
```

### Why This Happens

1. **CORS Policy**: External APIs (BLS, FRED) don't allow direct browser requests from GitHub Pages
2. **Static Hosting**: GitHub Pages serves static files only - no server-side API proxying
3. **Security**: Browsers block cross-origin requests to protect users

## ✅ Quick Fix: Use Sample Data

**For GitHub Pages deployment, the app now defaults to sample data** to avoid CORS issues.

### Current Configuration
- Default data source: `sample` (safe for GitHub Pages)
- Live APIs: Available but require proper server setup
- Error handling: Provides clear CORS error messages

## 🛠️ Solutions for Live API Data

### Option 1: Local Development with Proxy (Recommended)

1. **Clone and run locally**:
   ```bash
   git clone https://github.com/BurntFrost/finance-factors.git
   cd finance-factors/next-dashboard
   npm install
   npm run dev
   ```

2. **Set up API proxies** (create `next-dashboard/app/api/` directory):
   ```typescript
   // app/api/fred/route.ts
   export async function GET(request: Request) {
     const { searchParams } = new URL(request.url);
     const response = await fetch(`https://api.stlouisfed.org/fred/series/observations?${searchParams}`);
     return Response.json(await response.json());
   }
   ```

3. **Update environment**:
   ```bash
   # .env.local
   NEXT_PUBLIC_DEFAULT_DATA_SOURCE=live-api
   ```

### Option 2: Deploy with Server Support

Deploy to platforms that support server-side rendering:

- **Vercel** (recommended for Next.js)
- **Netlify** with functions
- **Railway** or **Heroku**
- **AWS** with Lambda functions

### Option 3: Browser Extension (Development Only)

For testing purposes only, disable CORS in Chrome:
```bash
# WARNING: Only for development, creates security risks
chrome --disable-web-security --user-data-dir="/tmp/chrome_dev"
```

## 🎯 Recommended Approach

### For Production Use:
1. Deploy to **Vercel** or similar platform with API route support
2. Implement API proxies in `app/api/` directory
3. Set `NEXT_PUBLIC_DEFAULT_DATA_SOURCE=live-api`

### For Demo/Portfolio:
1. Keep current GitHub Pages setup
2. Use sample data (current default)
3. Mention live API capability in documentation

## 🔧 Implementation Details

### Current Error Handling
The app now provides informative error messages:
```
CORS Error: Cannot access FRED API directly from browser.
This is expected for GitHub Pages deployment.
Switch to "Sample Data" mode or set up a proper server with API proxies.
```

### Data Source Toggle
Users can switch between:
- **Sample Data**: Works everywhere, no API keys needed
- **Live API**: Requires proper server setup with CORS handling

### Fallback Mechanism
1. Try live API (if configured)
2. Show clear CORS error message
3. Automatically fall back to mock data
4. User can manually switch to sample data

## 📚 Additional Resources

- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [CORS Explained](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Vercel Deployment](https://vercel.com/docs/concepts/deployments)
- [FRED API Documentation](https://fred.stlouisfed.org/docs/api/)
- [BLS API Documentation](https://www.bls.gov/developers/api_signature_v2.htm)
