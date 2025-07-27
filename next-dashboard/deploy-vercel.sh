#!/bin/bash

# Vercel Deployment Script for Finance Factors Dashboard
# This script sets up and deploys the dashboard with API proxy functionality

set -e  # Exit on any error

echo "🚀 Finance Factors Dashboard - Vercel Deployment"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

# Check if user is logged in
echo -e "${BLUE}🔐 Checking Vercel authentication...${NC}"
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Vercel. Please run 'vercel login' first.${NC}"
    echo -e "${BLUE}💡 Run this command and follow the prompts:${NC}"
    echo "   vercel login"
    echo ""
    echo -e "${BLUE}Then run this script again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Authenticated with Vercel${NC}"

# Check environment variables
echo -e "${BLUE}🔧 Checking environment variables...${NC}"

REQUIRED_VARS=("FRED_API_KEY" "BLS_API_KEY" "CENSUS_API_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Missing environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo -e "${BLUE}💡 You can set them in Vercel dashboard or via CLI:${NC}"
    echo "   vercel env add FRED_API_KEY"
    echo "   vercel env add BLS_API_KEY"
    echo "   vercel env add CENSUS_API_KEY"
    echo ""
    echo -e "${YELLOW}⚠️  Deployment will continue, but API proxy may not work without these.${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ All required environment variables found${NC}"
fi

# Build the project
echo -e "${BLUE}🔨 Building project...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Please fix build errors and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"

# Deploy to Vercel
echo -e "${BLUE}🚀 Deploying to Vercel...${NC}"

# Check if this is the first deployment
if [ ! -f ".vercel/project.json" ]; then
    echo -e "${YELLOW}📝 First deployment - setting up project...${NC}"
    vercel --prod
else
    echo -e "${BLUE}📦 Deploying to existing project...${NC}"
    vercel --prod
fi

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Deployment successful!${NC}"
    echo ""
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo "1. Visit your Vercel dashboard to see the deployment"
    echo "2. Test the API proxy health: https://your-app.vercel.app/api/proxy/health"
    echo "3. Check the dashboard for live data indicators"
    echo ""
    echo -e "${BLUE}🔧 If APIs aren't working:${NC}"
    echo "1. Check environment variables in Vercel dashboard"
    echo "2. Ensure API keys are set correctly"
    echo "3. Check function logs in Vercel dashboard"
    echo ""
    echo -e "${GREEN}✅ Finance Factors Dashboard deployed with live data support!${NC}"
else
    echo -e "${RED}❌ Deployment failed. Check the error messages above.${NC}"
    exit 1
fi
