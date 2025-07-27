#!/bin/bash

# Vercel Environment Variables Setup Script
# This script helps set up environment variables for the API proxy

set -e

echo "🔧 Setting up Vercel Environment Variables"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found. Please install it first:${NC}"
    echo "   npm install -g vercel"
    exit 1
fi

# Check if user is logged in
if ! vercel whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Vercel. Please run 'vercel login' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Vercel CLI ready${NC}"
echo ""

# Load current environment variables from .env.local
if [ -f ".env.local" ]; then
    echo -e "${BLUE}📋 Found .env.local file. Loading current values...${NC}"
    source .env.local
    echo -e "${GREEN}✅ Environment variables loaded${NC}"
else
    echo -e "${YELLOW}⚠️  No .env.local file found. You'll need to enter values manually.${NC}"
fi

echo ""
echo -e "${BLUE}🔑 Setting up API keys in Vercel...${NC}"
echo ""

# Function to set environment variable
set_env_var() {
    local var_name=$1
    local var_description=$2
    local current_value=${!var_name}
    
    echo -e "${BLUE}Setting up ${var_name}${NC}"
    echo "Description: $var_description"
    
    if [ -n "$current_value" ]; then
        echo -e "${GREEN}Current value found: ${current_value:0:10}...${NC}"
        read -p "Use this value? (Y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            current_value=""
        fi
    fi
    
    if [ -z "$current_value" ]; then
        echo -e "${YELLOW}Please enter the $var_name:${NC}"
        read -s current_value
        echo
    fi
    
    if [ -n "$current_value" ]; then
        echo "$current_value" | vercel env add "$var_name" production
        echo "$current_value" | vercel env add "$var_name" preview
        echo "$current_value" | vercel env add "$var_name" development
        echo -e "${GREEN}✅ $var_name set for all environments${NC}"
    else
        echo -e "${YELLOW}⚠️  Skipping $var_name (no value provided)${NC}"
    fi
    
    echo ""
}

# Set up each API key
set_env_var "FRED_API_KEY" "Federal Reserve Economic Data API key (get from https://fred.stlouisfed.org/docs/api/api_key.html)"
set_env_var "BLS_API_KEY" "Bureau of Labor Statistics API key (get from https://www.bls.gov/developers/api_signature_v2.htm)"
set_env_var "CENSUS_API_KEY" "US Census Bureau API key (get from https://api.census.gov/data/key_signup.html)"

# Optional: Alpha Vantage
echo -e "${BLUE}📈 Alpha Vantage API (optional)${NC}"
echo "This is used for additional financial data. You can skip this if you don't have a key."
read -p "Do you want to set up Alpha Vantage API key? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    set_env_var "ALPHA_VANTAGE_API_KEY" "Alpha Vantage API key (get from https://www.alphavantage.co/support/#api-key)"
fi

# Set up application configuration
echo -e "${BLUE}⚙️  Setting up application configuration...${NC}"

echo "live-api" | vercel env add "NEXT_PUBLIC_DEFAULT_DATA_SOURCE" production
echo "live-api" | vercel env add "NEXT_PUBLIC_DEFAULT_DATA_SOURCE" preview
echo "live-api" | vercel env add "NEXT_PUBLIC_DEFAULT_DATA_SOURCE" development

echo "true" | vercel env add "NEXT_PUBLIC_USE_API_PROXY" production
echo "true" | vercel env add "NEXT_PUBLIC_USE_API_PROXY" preview
echo "true" | vercel env add "NEXT_PUBLIC_USE_API_PROXY" development

echo "true" | vercel env add "NEXT_PUBLIC_ENABLE_CACHING" production
echo "true" | vercel env add "NEXT_PUBLIC_ENABLE_CACHING" preview
echo "true" | vercel env add "NEXT_PUBLIC_ENABLE_CACHING" development

echo -e "${GREEN}✅ Application configuration set${NC}"

echo ""
echo -e "${GREEN}🎉 Environment variables setup complete!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "• API keys configured for all environments (production, preview, development)"
echo "• Application configured to use live data with API proxy"
echo "• Caching enabled for better performance"
echo ""
echo -e "${BLUE}🚀 Next steps:${NC}"
echo "1. Run './deploy-vercel.sh' to deploy your application"
echo "2. Or run 'vercel --prod' to deploy manually"
echo ""
echo -e "${BLUE}🔍 To verify environment variables:${NC}"
echo "• Visit your Vercel dashboard"
echo "• Go to your project settings"
echo "• Check the Environment Variables section"
