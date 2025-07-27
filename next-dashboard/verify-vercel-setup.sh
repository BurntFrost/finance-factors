#!/bin/bash

# Vercel Setup Verification Script
# This script verifies that all required components are configured for automatic deployment

set -e

echo "🔍 Vercel Automatic Deployment Setup Verification"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track verification status
VERIFICATION_PASSED=true

# Function to check status
check_status() {
    local status=$1
    local message=$2
    
    if [ "$status" = "true" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    else
        echo -e "${RED}❌ $message${NC}"
        VERIFICATION_PASSED=false
    fi
}

echo -e "${BLUE}1. Checking Vercel CLI installation...${NC}"
if command -v vercel &> /dev/null; then
    check_status "true" "Vercel CLI is installed"
    VERCEL_VERSION=$(vercel --version)
    echo -e "   Version: $VERCEL_VERSION"
else
    check_status "false" "Vercel CLI is not installed"
    echo -e "${YELLOW}   Install with: npm install -g vercel${NC}"
fi

echo ""
echo -e "${BLUE}2. Checking Vercel authentication...${NC}"
if vercel whoami &> /dev/null; then
    VERCEL_USER=$(vercel whoami)
    check_status "true" "Logged in to Vercel as: $VERCEL_USER"
else
    check_status "false" "Not logged in to Vercel"
    echo -e "${YELLOW}   Login with: vercel login${NC}"
fi

echo ""
echo -e "${BLUE}3. Checking project configuration...${NC}"
if [ -f ".vercel/project.json" ]; then
    check_status "true" "Vercel project configuration found"
    
    # Extract project details
    PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId":"[^"]*' | cut -d'"' -f4)
    ORG_ID=$(cat .vercel/project.json | grep -o '"orgId":"[^"]*' | cut -d'"' -f4)
    
    echo -e "   Project ID: ${PROJECT_ID:0:20}..."
    echo -e "   Org ID: ${ORG_ID:0:20}..."
else
    check_status "false" "Vercel project not configured"
    echo -e "${YELLOW}   Run 'vercel' to set up project${NC}"
fi

echo ""
echo -e "${BLUE}4. Checking environment variables in Vercel...${NC}"
if command -v vercel &> /dev/null && vercel whoami &> /dev/null; then
    # Check for required environment variables
    ENV_VARS=$(vercel env ls 2>/dev/null || echo "")
    
    if echo "$ENV_VARS" | grep -q "FRED_API_KEY"; then
        check_status "true" "FRED_API_KEY is configured"
    else
        check_status "false" "FRED_API_KEY is missing"
    fi
    
    if echo "$ENV_VARS" | grep -q "BLS_API_KEY"; then
        check_status "true" "BLS_API_KEY is configured"
    else
        check_status "false" "BLS_API_KEY is missing"
    fi
    
    if echo "$ENV_VARS" | grep -q "CENSUS_API_KEY"; then
        check_status "true" "CENSUS_API_KEY is configured"
    else
        check_status "false" "CENSUS_API_KEY is missing"
    fi
else
    check_status "false" "Cannot check environment variables (Vercel CLI not available or not logged in)"
fi

echo ""
echo -e "${BLUE}5. Checking GitHub Actions workflow...${NC}"
if [ -f "../.github/workflows/deploy.yml" ]; then
    check_status "true" "GitHub Actions workflow file exists"
    
    # Check if it's the Vercel workflow
    if grep -q "Deploy to Vercel" "../.github/workflows/deploy.yml"; then
        check_status "true" "Workflow is configured for Vercel deployment"
    else
        check_status "false" "Workflow is not configured for Vercel deployment"
    fi
else
    check_status "false" "GitHub Actions workflow file not found"
fi

echo ""
echo -e "${BLUE}6. Checking required files...${NC}"

# Check vercel.json
if [ -f "vercel.json" ]; then
    check_status "true" "vercel.json configuration file exists"
else
    check_status "false" "vercel.json configuration file missing"
fi

# Check API proxy files
if [ -f "app/api/proxy/health.ts" ]; then
    check_status "true" "API proxy health endpoint exists"
else
    check_status "false" "API proxy health endpoint missing"
fi

if [ -f "app/api/proxy/data.ts" ]; then
    check_status "true" "API proxy data endpoint exists"
else
    check_status "false" "API proxy data endpoint missing"
fi

echo ""
echo -e "${BLUE}7. Checking package.json scripts...${NC}"
if grep -q "deploy:vercel" package.json; then
    check_status "true" "Vercel deployment scripts are configured"
else
    check_status "false" "Vercel deployment scripts missing"
fi

echo ""
echo "================================================="

if [ "$VERIFICATION_PASSED" = "true" ]; then
    echo -e "${GREEN}🎉 All checks passed! Your setup is ready for automatic Vercel deployment.${NC}"
    echo ""
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo "1. Configure GitHub Secrets (see VERCEL_AUTO_DEPLOYMENT_SETUP.md)"
    echo "2. Push to main branch to trigger automatic deployment"
    echo "3. Monitor deployment in GitHub Actions tab"
    echo ""
    echo -e "${GREEN}✅ Ready to deploy!${NC}"
else
    echo -e "${RED}❌ Some issues need to be resolved before automatic deployment will work.${NC}"
    echo ""
    echo -e "${BLUE}📋 To fix issues:${NC}"
    echo "1. Follow the setup guide in VERCEL_AUTO_DEPLOYMENT_SETUP.md"
    echo "2. Run this script again to verify fixes"
    echo "3. Contact support if issues persist"
    echo ""
    echo -e "${YELLOW}⚠️  Please resolve the issues above before deploying.${NC}"
fi

echo ""
