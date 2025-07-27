#!/bin/bash

# GitHub Secrets Verification Script for Vercel Deployment
# This script helps you gather the information needed for GitHub Actions deployment

set -e

echo "🔍 GitHub Secrets Setup Helper"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found.${NC}"
    echo -e "${BLUE}💡 Install with: npm install -g vercel${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Vercel CLI found${NC}"

# Check if user is logged in
echo -e "${BLUE}🔐 Checking Vercel authentication...${NC}"
if ! vercel whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Vercel.${NC}"
    echo -e "${BLUE}💡 Run: vercel login${NC}"
    exit 1
fi

VERCEL_USER=$(vercel whoami)
echo -e "${GREEN}✅ Logged in as: $VERCEL_USER${NC}"

# Get organization ID
echo ""
echo -e "${BLUE}📋 Getting your Vercel information...${NC}"
echo ""

echo -e "${YELLOW}1. VERCEL_ORG_ID:${NC}"
if [ -f ".vercel/project.json" ]; then
    ORG_ID=$(cat .vercel/project.json | grep -o '"orgId":"[^"]*' | cut -d'"' -f4)
    if [ -n "$ORG_ID" ]; then
        echo -e "${GREEN}   $ORG_ID${NC}"
    else
        echo -e "${YELLOW}   Could not find orgId in .vercel/project.json${NC}"
        echo -e "${BLUE}   Try running: vercel teams ls${NC}"
    fi
else
    echo -e "${YELLOW}   No .vercel/project.json found${NC}"
    echo -e "${BLUE}   Run 'vercel' in this directory first to link the project${NC}"
fi

echo ""
echo -e "${YELLOW}2. VERCEL_PROJECT_ID:${NC}"
if [ -f ".vercel/project.json" ]; then
    PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId":"[^"]*' | cut -d'"' -f4)
    if [ -n "$PROJECT_ID" ]; then
        echo -e "${GREEN}   $PROJECT_ID${NC}"
    else
        echo -e "${YELLOW}   Could not find projectId in .vercel/project.json${NC}"
    fi
else
    echo -e "${YELLOW}   No .vercel/project.json found${NC}"
    echo -e "${BLUE}   Run 'vercel' in this directory first to link the project${NC}"
fi

echo ""
echo -e "${YELLOW}3. VERCEL_TOKEN:${NC}"
echo -e "${BLUE}   You need to create this manually:${NC}"
echo -e "${BLUE}   1. Go to https://vercel.com/account/tokens${NC}"
echo -e "${BLUE}   2. Click 'Create Token'${NC}"
echo -e "${BLUE}   3. Name it 'GitHub Actions'${NC}"
echo -e "${BLUE}   4. Copy the token (starts with 'vercel_')${NC}"

echo ""
echo -e "${GREEN}📋 Summary for GitHub Secrets:${NC}"
echo ""
echo -e "${BLUE}Go to your GitHub repository:${NC}"
echo -e "${BLUE}Settings → Secrets and variables → Actions → New repository secret${NC}"
echo ""

if [ -n "$ORG_ID" ]; then
    echo -e "${GREEN}VERCEL_ORG_ID = $ORG_ID${NC}"
else
    echo -e "${YELLOW}VERCEL_ORG_ID = <get from 'vercel teams ls'>${NC}"
fi

if [ -n "$PROJECT_ID" ]; then
    echo -e "${GREEN}VERCEL_PROJECT_ID = $PROJECT_ID${NC}"
else
    echo -e "${YELLOW}VERCEL_PROJECT_ID = <run 'vercel' to link project first>${NC}"
fi

echo -e "${YELLOW}VERCEL_TOKEN = <create at https://vercel.com/account/tokens>${NC}"

echo ""
echo -e "${BLUE}🚀 After adding these secrets to GitHub:${NC}"
echo -e "${BLUE}   git push origin main${NC}"
echo -e "${BLUE}   → Automatic deployment will start!${NC}"

echo ""
echo -e "${GREEN}✅ Setup helper complete!${NC}"
