# 🚀 Vercel Automatic Deployment Setup

This guide will help you set up automatic Vercel deployment that triggers on every push to the main branch.

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally with `npm install -g vercel`
3. **GitHub Repository**: Your code should be in a GitHub repository

## 🔧 Step 1: Initial Vercel Project Setup

### 1.1 Login to Vercel
```bash
cd next-dashboard
vercel login
```

### 1.2 Create Vercel Project
```bash
# This will create a new project and link it to your repository
vercel --prod
```

Follow the prompts:
- **Set up and deploy**: Yes
- **Which scope**: Choose your account/team
- **Link to existing project**: No (create new)
- **Project name**: `finance-factors` (or your preferred name)
- **Directory**: `./` (current directory)
- **Override settings**: No

### 1.3 Get Project Information
After deployment, get your project details:
```bash
# Get organization ID
vercel teams ls

# Get project ID (from .vercel/project.json)
cat .vercel/project.json
```

## 🔑 Step 2: Configure GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Add these **Repository Secrets**:

### Required Secrets:
1. **VERCEL_TOKEN**
   - Go to [Vercel Dashboard](https://vercel.com/account/tokens)
   - Create a new token with appropriate scope
   - Copy the token value

2. **VERCEL_ORG_ID**
   - From `vercel teams ls` command output
   - Or from your Vercel dashboard URL: `vercel.com/[ORG_ID]/...`

3. **VERCEL_PROJECT_ID**
   - From `.vercel/project.json` file
   - Or from your project settings in Vercel dashboard

## 🌍 Step 3: Configure Environment Variables in Vercel

### Option A: Using the Setup Script (Recommended)
```bash
cd next-dashboard
./setup-vercel-env.sh
```

### Option B: Manual Setup via Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables for **Production**, **Preview**, and **Development**:

```
FRED_API_KEY=your_fred_api_key_here
BLS_API_KEY=your_bls_api_key_here  
CENSUS_API_KEY=your_census_api_key_here
```

### Option C: Using Vercel CLI
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

## 🔄 Step 4: Test the Automatic Deployment

### 4.1 Verify GitHub Secrets
1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Confirm all three secrets are present:
   - ✅ `VERCEL_TOKEN`
   - ✅ `VERCEL_ORG_ID`
   - ✅ `VERCEL_PROJECT_ID`

### 4.2 Test Deployment
1. Make a small change to your code
2. Commit and push to main branch:
   ```bash
   git add .
   git commit -m "Test automatic Vercel deployment"
   git push origin main
   ```

3. Check GitHub Actions:
   - Go to **Actions** tab in your repository
   - Watch the "Deploy to Vercel" workflow
   - Verify it completes successfully

### 4.3 Verify API Functionality
After deployment completes:
1. Visit your Vercel deployment URL
2. Test API endpoints:
   - `https://your-app.vercel.app/api/proxy/health`
   - `https://your-app.vercel.app/api/proxy/data?source=fred&series=MSPUS`

## 🎯 How It Works

### Automatic Deployment Triggers
- ✅ **Push to main**: Deploys to production
- ✅ **Pull Request**: Creates preview deployment
- ✅ **Linting**: Runs before deployment
- ✅ **API Testing**: Verifies endpoints after deployment

### Deployment Process
1. **Checkout code** from GitHub
2. **Install dependencies** with npm
3. **Run linting** to catch issues
4. **Pull Vercel config** and environment variables
5. **Build project** with production optimizations
6. **Deploy to Vercel** with prebuilt artifacts
7. **Test API endpoints** to verify functionality

## 🔍 Troubleshooting

### Common Issues:

**❌ "VERCEL_TOKEN is not set"**
- Verify the token is added to GitHub Secrets
- Ensure token has correct permissions

**❌ "Project not found"**
- Check `VERCEL_PROJECT_ID` matches your project
- Verify `VERCEL_ORG_ID` is correct

**❌ "API endpoints returning 500"**
- Check environment variables in Vercel dashboard
- Verify API keys are valid and not expired

**❌ "Build failed"**
- Check the GitHub Actions logs
- Ensure all dependencies are properly installed

### Debug Commands:
```bash
# Check Vercel project info
vercel ls

# View environment variables
vercel env ls

# Check deployment logs
vercel logs

# Test local build
npm run build
```

## 📈 Next Steps

After successful setup:
1. **Monitor deployments** in GitHub Actions
2. **Check performance** in Vercel Analytics
3. **Review logs** for any API issues
4. **Update API keys** as needed in Vercel dashboard

Your finance factors dashboard now automatically deploys to Vercel with full API functionality on every push to main! 🎉
