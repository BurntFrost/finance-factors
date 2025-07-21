# GitHub Pages Deployment Guide

This guide will help you deploy your Finance Factors dashboard to GitHub Pages with live API data.

## 🚀 Quick Setup

### Step 1: Enable GitHub Pages

1. Go to your GitHub repository
2. Click **Settings** tab
3. Scroll down to **Pages** section
4. Under **Source**, select **GitHub Actions**

### Step 2: Push to Main Branch

**No secrets needed!** The API keys are embedded directly in the build process since they'll be public in the browser anyway.

The GitHub Actions workflow will automatically trigger when you push to the `main` branch:

```bash
git add .
git commit -m "Deploy to GitHub Pages with live API data"
git push origin main
```

### Step 3: Monitor Deployment

1. Go to **Actions** tab in your repository
2. Watch the "Deploy Finance Factors Dashboard to GitHub Pages" workflow
3. Once complete, your site will be available at: `https://yourusername.github.io/finance-factors`

## 🔧 Configuration Details

### Workflow File

The deployment is handled by `.github/workflows/deploy.yml` which:

- ✅ Builds the Next.js app with your API keys
- ✅ Optimizes for static deployment
- ✅ Handles GitHub Pages configuration automatically
- ✅ Caches dependencies for faster builds

### Environment Variables

During build, these environment variables are set:

```yaml
NEXT_PUBLIC_FRED_API_KEY: ${{ secrets.FRED_API_KEY }}
NEXT_PUBLIC_BLS_API_KEY: ${{ secrets.BLS_API_KEY }}
NEXT_PUBLIC_CENSUS_API_KEY: ${{ secrets.CENSUS_API_KEY }}
NEXT_PUBLIC_DEFAULT_DATA_SOURCE: live-api
NEXT_PUBLIC_ENABLE_CACHING: true
```

### Base Path Handling

The workflow automatically detects if you're deploying to:
- **User/Organization site**: `https://username.github.io` (no base path)
- **Project site**: `https://username.github.io/repository-name` (with base path)

## 🔍 Troubleshooting

### Build Fails

1. **Check Secrets**: Ensure all API keys are added as repository secrets
2. **Check Syntax**: Verify no syntax errors in your code
3. **Check Logs**: Review the Actions tab for detailed error messages

### Site Not Loading

1. **Wait**: Initial deployment can take 5-10 minutes
2. **Check URL**: Ensure you're using the correct GitHub Pages URL
3. **Clear Cache**: Hard refresh your browser (Ctrl+F5 or Cmd+Shift+R)

### API Data Not Loading

1. **Check Console**: Open browser dev tools and check for API errors
2. **Verify Keys**: Ensure API keys are valid and not expired
3. **Check Limits**: Verify you haven't exceeded API rate limits

### Common Issues

| Issue | Solution |
|-------|----------|
| 404 Page Not Found | Check that GitHub Pages is enabled and workflow completed |
| API Keys Not Working | Verify secrets are named exactly as shown above |
| Build Taking Too Long | Check for infinite loops or large dependencies |
| Charts Not Displaying | Check browser console for JavaScript errors |

## 📊 Monitoring Your Deployment

### GitHub Actions

- **Build Time**: Typically 2-3 minutes
- **Deploy Time**: Additional 1-2 minutes
- **Total Time**: 3-5 minutes from push to live

### API Usage

Monitor your API usage to avoid rate limits:

- **FRED**: 120 requests/minute (very generous)
- **BLS**: 500 requests/day with key
- **Census**: No strict limits
- **Alpha Vantage**: 25 requests/day (free tier)

## 🔒 Security Notes

### API Key Exposure

⚠️ **Important**: API keys will be embedded in the client-side JavaScript and visible to users.

**Mitigation strategies**:
- Use free government APIs (FRED, BLS, Census) which are designed for public use
- Monitor API usage regularly
- Set up usage alerts where possible
- Rotate keys periodically

### Best Practices

1. **Monitor Usage**: Check your API dashboards weekly
2. **Set Alerts**: Enable usage alerts on your API accounts
3. **Use Free Tiers**: Stick to free API tiers to limit exposure
4. **Regular Rotation**: Rotate API keys every 6 months

## 🚀 Advanced Configuration

### Custom Domain

To use a custom domain:

1. Add a `CNAME` file to your repository root:
   ```
   yourdomain.com
   ```

2. Configure DNS with your domain provider:
   ```
   CNAME record: www.yourdomain.com → yourusername.github.io
   ```

### Environment-Specific Builds

To deploy different configurations for staging/production:

1. Create separate branches (`staging`, `production`)
2. Modify workflow to trigger on different branches
3. Use different secret names for each environment

### Performance Optimization

The build includes several optimizations:

- **Code Splitting**: Separate chunks for Chart.js and React
- **Caching**: Aggressive caching of dependencies
- **Compression**: Gzip compression enabled
- **Image Optimization**: Disabled for static export compatibility

## 📈 Next Steps

After successful deployment:

1. **Test All Features**: Verify all charts and data sources work
2. **Monitor Performance**: Check loading times and API response times
3. **Set Up Analytics**: Consider adding Google Analytics
4. **Share Your Dashboard**: Your live dashboard is now ready to share!

## 🆘 Need Help?

If you encounter issues:

1. **Check Actions Log**: Detailed build logs in the Actions tab
2. **Review Documentation**: See `API_INTEGRATION.md` for API details
3. **Test Locally**: Ensure everything works in development first
4. **Check GitHub Status**: Verify GitHub Pages service is operational

Your dashboard should now be live at: `https://yourusername.github.io/finance-factors`
