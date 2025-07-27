# Vercel + GitHub Actions Deployment Setup

This guide will help you configure automatic deployments to Vercel using GitHub Actions for the Finance Factors Dashboard.

## Overview

- **Primary Hosting**: Vercel (with full API support)
- **Repository**: GitHub (version control)
- **CI/CD**: GitHub Actions (automatic deployment)
- **Deployment Trigger**: Push to `main` branch

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

## Step 2: Configure GitHub Secrets

Go to your GitHub repository and add these secrets:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** for each of the following:

### Required Secrets

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `VERCEL_TOKEN` | Your Vercel API token | `vercel_1234567890abcdef...` |
| `VERCEL_ORG_ID` | Your Vercel organization ID | `team_abc123` or `your-username` |
| `VERCEL_PROJECT_ID` | Your Vercel project ID | `prj_abc123def456...` |

### Optional Environment Variables

You can also add these as secrets if you want to override the default API keys:

| Secret Name | Description |
|-------------|-------------|
| `FRED_API_KEY` | Federal Reserve Economic Data API key |
| `BLS_API_KEY` | Bureau of Labor Statistics API key |
| `CENSUS_API_KEY` | US Census Bureau API key |
| `ALPHA_VANTAGE_API_KEY` | Alpha Vantage financial data API key |

## Step 3: Verify Setup

### 3.1 Check Workflow File

Ensure the GitHub Actions workflow is properly configured:

```yaml
# .github/workflows/deploy.yml should exist and be active
```

### 3.2 Test Deployment

1. Make a small change to your code
2. Commit and push to the `main` branch:
   ```bash
   git add .
   git commit -m "Test automatic deployment"
   git push origin main
   ```
3. Go to **Actions** tab in your GitHub repository
4. Watch the deployment workflow run

### 3.3 Verify Deployment

After the workflow completes:

1. Check the workflow logs for the deployment URL
2. Visit the URL to ensure the site is working
3. Test the API endpoints:
   - `https://your-app.vercel.app/api/proxy/health`
   - `https://your-app.vercel.app/api/proxy/data?source=fred&series=MSPUS`

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

## Benefits of This Setup

✅ **Automatic Deployments**: Push to main = instant deployment  
✅ **Preview Deployments**: Every PR gets a preview URL  
✅ **Full API Support**: Unlike GitHub Pages, Vercel supports serverless functions  
✅ **Zero Configuration**: No manual deployment steps needed  
✅ **Rollback Support**: Easy to revert via Vercel dashboard  
✅ **Performance**: Vercel's global CDN and edge functions  

## Next Steps

Once setup is complete:

1. All future deployments happen automatically on push to `main`
2. Use `npm run deploy` to see deployment status
3. Monitor deployments in both GitHub Actions and Vercel dashboard
4. Configure custom domains in Vercel if needed

---

**Note**: This setup replaces the previous GitHub Pages deployment. The GitHub Pages workflow has been disabled in favor of Vercel's superior performance and API support.
