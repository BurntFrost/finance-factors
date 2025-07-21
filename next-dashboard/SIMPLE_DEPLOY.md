# 🚀 Simple GitHub Pages Deployment

**No secrets, no complexity - just push and deploy!**

## ⚡ Quick Deploy (2 steps)

### Step 1: Enable GitHub Pages
1. Go to your repository **Settings**
2. Scroll to **Pages** section
3. Under **Source**, select **GitHub Actions**

### Step 2: Push to Deploy
```bash
git add .
git commit -m "Deploy with live API data"
git push origin main
```

**That's it!** Your dashboard will be live at: `https://yourusername.github.io/finance-factors`

## 🔑 API Keys

The API keys are already embedded in the deployment workflow:
- **FRED**: `d45d9655ab79981088aa17b30a0c741b` ✅
- **BLS**: `81277313b0e141148d59fa83125510de` ✅  
- **Census**: `e0d9fd6f239294efa560fd5b8d382d6978439e7b` ✅

**No GitHub Secrets needed** - the keys will be public in the browser anyway.

## ⏱️ Timeline

- **Push code**: Instant
- **Build starts**: ~30 seconds
- **Build completes**: ~3 minutes
- **Site live**: ~5 minutes total

## 🎯 What You Get

✅ **Real Financial Data**: Live housing prices, employment data, economic indicators  
✅ **Government APIs**: FRED, BLS, Census Bureau data  
✅ **Interactive Charts**: Hover effects, data source switching  
✅ **Mobile Responsive**: Works on all devices  
✅ **Fast Loading**: Optimized for performance  
✅ **Auto Updates**: Redeploys on every push  

## 🔍 Verify Deployment

1. **Check Actions**: Go to Actions tab, watch for green checkmark
2. **Visit Site**: `https://yourusername.github.io/finance-factors`
3. **Test Features**: 
   - Charts load with real data
   - Data source selector works
   - API health status shows green
   - Mobile view works

## 🚨 If Something Goes Wrong

1. **Build Fails**: Check Actions tab for error details
2. **Site Not Loading**: Wait 5-10 minutes, try hard refresh
3. **No Data**: Check browser console for API errors
4. **Test Locally**: Run `npm run dev` to test locally first

## 🎉 Success!

Your dashboard is now live with real financial data from:
- **Federal Reserve** (housing prices, interest rates)
- **Bureau of Labor Statistics** (employment, wages)
- **Census Bureau** (demographics, income)

**Share your dashboard**: `https://yourusername.github.io/finance-factors`

---

**Need more details?** See `GITHUB_DEPLOYMENT.md` for comprehensive documentation.
