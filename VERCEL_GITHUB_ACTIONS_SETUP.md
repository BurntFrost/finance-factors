# Vercel + GitHub Actions Deployment Setup

✅ **Setup Complete!** This project is fully configured with automatic Vercel deployment via GitHub Actions.

## Current Status

- **Primary Hosting**: Vercel (with full API support)
- **Repository**: GitHub (version control)
- **CI/CD**: GitHub Actions (automatic deployment)
- **Deployment Trigger**: Push to `main` branch
- **GitHub Secrets**: ✅ Configured
- **Auto-Deploy**: ✅ Active

## Prerequisites

1. Vercel account with the Finance Factors project already set up
2. GitHub repository with admin access
3. Vercel CLI installed locally (for getting project info)

## Step 1: Get Vercel Project Information

First, you need to gather the required information from your Vercel project:

### 1.1 Get Vercel Token

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your profile picture → **Settings**
3. Go to **Tokens** tab
4. Click **Create Token**
5. Name it "GitHub Actions" and set scope to your account/team
6. Copy the token (starts with `vercel_`)

### 1.2 Get Organization ID

```bash
# Login to Vercel CLI
vercel login

# Get your organization/team ID
vercel teams ls
```

Copy the ID of your organization (usually starts with `team_` or is your username).

### 1.3 Get Project ID

```bash
# Navigate to your project directory
cd next-dashboard

# Get project information
vercel project ls

# Or check the .vercel/project.json file
cat .vercel/project.json
```

Copy the `projectId` value.

## ✅ GitHub Secrets Configuration (Complete)

The required GitHub secrets have been configured:

### Configured Secrets

| Secret Name | Status | Description |
|-------------|--------|-------------|
| `VERCEL_TOKEN` | ✅ Set | Your Vercel API token |
| `VERCEL_ORG_ID` | ✅ Set | Your Vercel organization ID |
| `VERCEL_PROJECT_ID` | ✅ Set | Your Vercel project ID |

### Optional Environment Variables

These can be added as GitHub secrets if you want to override the default API keys:

| Secret Name | Status | Description |
|-------------|--------|-------------|
| `FRED_API_KEY` | Optional | Federal Reserve Economic Data API key |
| `BLS_API_KEY` | Optional | Bureau of Labor Statistics API key |
| `CENSUS_API_KEY` | Optional | US Census Bureau API key |
| `ALPHA_VANTAGE_API_KEY` | Optional | Alpha Vantage financial data API key |

## ✅ Deployment Verification (Active)

### Current Deployment Status

- **GitHub Actions Workflow**: ✅ Active
- **Production URL**: https://finance-factors.vercel.app
- **API Health Check**: https://finance-factors.vercel.app/api/proxy/health
- **Automatic Deployment**: ✅ Working

### How to Deploy

Simply push to the main branch:

```bash
git add .
git commit -m "Your changes"
git push origin main
# → GitHub Actions automatically deploys to Vercel
```

### Monitor Deployments

- **GitHub Actions**: [View workflow runs](https://github.com/BurntFrost/finance-factors/actions)
- **Vercel Dashboard**: [View deployments](https://vercel.com/dashboard)
- **Live Site**: [https://finance-factors.vercel.app](https://finance-factors.vercel.app)

## Step 4: Configure Pull Request Previews

The workflow automatically creates preview deployments for pull requests:

1. Create a new branch and make changes
2. Open a pull request
3. The workflow will deploy a preview and comment on the PR with the URL

## Troubleshooting

### Common Issues

1. **"Context access might be invalid" warnings**
   - These are normal if secrets aren't set up yet
   - Add the required secrets to resolve

2. **"Authentication failed" errors**
   - Check that `VERCEL_TOKEN` is correct and not expired
   - Ensure the token has the right permissions

3. **"Project not found" errors**
   - Verify `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are correct
   - Make sure the project exists in Vercel

4. **Build failures**
   - Check the workflow logs for specific error messages
   - Ensure all dependencies are properly listed in `package.json`

### Getting Help

1. Check the **Actions** tab for detailed error logs
2. Verify all secrets are properly set in GitHub
3. Test local deployment with `npm run deploy:manual`
4. Check Vercel dashboard for any project-specific issues

## ✅ Active Benefits

Your deployment setup provides:

✅ **Automatic Deployments**: Push to main = instant deployment
✅ **Preview Deployments**: Every PR gets a preview URL
✅ **Full API Support**: Serverless functions for live government data
✅ **Zero Manual Steps**: No deployment commands needed
✅ **Rollback Support**: Easy to revert via Vercel dashboard
✅ **Global Performance**: Vercel's CDN and edge functions

## Daily Workflow

Your typical development workflow:

1. **Develop**: Make changes locally with `npm run dev`
2. **Commit**: `git add . && git commit -m "Your changes"`
3. **Deploy**: `git push origin main` (automatic deployment starts)
4. **Monitor**: Check GitHub Actions for deployment status
5. **Verify**: Visit https://finance-factors.vercel.app to see changes live

## Maintenance

- **Monitor**: Check [GitHub Actions](https://github.com/BurntFrost/finance-factors/actions) for deployment health
- **Update**: Dependencies and API keys as needed
- **Scale**: Upgrade Vercel plan if traffic increases
- **Domains**: Configure custom domains in Vercel dashboard

---

**Status**: ✅ Fully operational with automatic Vercel deployment via GitHub Actions
