#!/usr/bin/env node

/**
 * Deployment Readiness Test
 * 
 * Checks if the project is ready for Vercel deployment
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  const status = exists ? `${colors.green}✅` : `${colors.red}❌`;
  console.log(`   ${status} ${description}${colors.reset}`);
  return exists;
}

function checkEnvVar(varName, description) {
  const value = process.env[varName];
  const exists = !!value;
  const status = exists ? `${colors.green}✅` : `${colors.yellow}⚠️ `;
  const displayValue = exists ? `${value.substring(0, 8)}...` : 'Not set';
  console.log(`   ${status} ${varName}: ${displayValue}${colors.reset}`);
  return exists;
}

function main() {
  console.log(`${colors.bold}${colors.blue}Finance Factors Dashboard - Deployment Readiness Check${colors.reset}\n`);

  let allGood = true;

  // Check required files
  console.log(`${colors.blue}📁 Checking required files...${colors.reset}`);
  const requiredFiles = [
    ['package.json', 'Package configuration'],
    ['next.config.ts', 'Next.js configuration'],
    ['vercel.json', 'Vercel configuration'],
    ['app/api/proxy/health/route.ts', 'Health check API route'],
    ['app/api/proxy/data/route.ts', 'Data proxy API route'],
    ['app/services/proxyApiService.ts', 'Proxy API service'],
    ['deploy-vercel.sh', 'Deployment script'],
    ['setup-vercel-env.sh', 'Environment setup script'],
    ['VERCEL_DEPLOYMENT_GUIDE.md', 'Deployment guide'],
  ];

  requiredFiles.forEach(([file, desc]) => {
    if (!checkFile(file, desc)) {
      allGood = false;
    }
  });

  console.log();

  // Check environment variables
  console.log(`${colors.blue}🔑 Checking environment variables...${colors.reset}`);
  
  // Load .env.local if it exists
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value && !key.startsWith('#')) {
        process.env[key] = value;
      }
    });
  }

  const requiredEnvVars = [
    ['FRED_API_KEY', 'Federal Reserve Economic Data API'],
    ['BLS_API_KEY', 'Bureau of Labor Statistics API'],
    ['CENSUS_API_KEY', 'US Census Bureau API'],
  ];

  const optionalEnvVars = [
    ['ALPHA_VANTAGE_API_KEY', 'Alpha Vantage API (optional)'],
  ];

  let envVarsSet = 0;
  requiredEnvVars.forEach(([varName, desc]) => {
    if (checkEnvVar(varName, desc)) {
      envVarsSet++;
    }
  });

  optionalEnvVars.forEach(([varName, desc]) => {
    checkEnvVar(varName, desc);
  });

  console.log();

  // Check package.json scripts
  console.log(`${colors.blue}📜 Checking package.json scripts...${colors.reset}`);
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredScripts = [
      'build',
      'deploy:vercel',
      'setup:vercel',
      'test:proxy',
    ];

    requiredScripts.forEach(script => {
      const exists = !!packageJson.scripts[script];
      const status = exists ? `${colors.green}✅` : `${colors.red}❌`;
      console.log(`   ${status} ${script}${colors.reset}`);
      if (!exists) allGood = false;
    });
  } catch (error) {
    console.log(`   ${colors.red}❌ Error reading package.json${colors.reset}`);
    allGood = false;
  }

  console.log();

  // Check API route structure
  console.log(`${colors.blue}🛣️  Checking API route structure...${colors.reset}`);
  const apiRoutes = [
    'app/api/proxy/health/route.ts',
    'app/api/proxy/data/route.ts',
  ];

  apiRoutes.forEach(route => {
    const exists = fs.existsSync(route);
    const status = exists ? `${colors.green}✅` : `${colors.red}❌`;
    console.log(`   ${status} ${route}${colors.reset}`);
    if (!exists) allGood = false;
  });

  console.log();

  // Summary
  console.log(`${colors.bold}${colors.blue}📋 Deployment Readiness Summary${colors.reset}`);
  console.log(`   Files: ${allGood ? colors.green + '✅ All required files present' : colors.red + '❌ Missing files'}${colors.reset}`);
  console.log(`   Environment: ${envVarsSet >= 2 ? colors.green + '✅ API keys configured' : colors.yellow + '⚠️  Some API keys missing'}${colors.reset}`);
  console.log(`   Structure: ${allGood ? colors.green + '✅ Project structure correct' : colors.red + '❌ Structure issues'}${colors.reset}`);

  console.log();

  if (allGood && envVarsSet >= 2) {
    console.log(`${colors.green}🎉 Project is ready for Vercel deployment!${colors.reset}`);
    console.log();
    console.log(`${colors.blue}🚀 Next steps:${colors.reset}`);
    console.log(`   1. Run: ${colors.yellow}npm run vercel:login${colors.reset}`);
    console.log(`   2. Run: ${colors.yellow}npm run setup:vercel${colors.reset}`);
    console.log(`   3. Run: ${colors.yellow}npm run deploy:vercel${colors.reset}`);
    console.log();
    console.log(`${colors.blue}📖 Or follow the guide: VERCEL_DEPLOYMENT_GUIDE.md${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Project needs attention before deployment${colors.reset}`);
    console.log();
    console.log(`${colors.blue}🔧 Issues to fix:${colors.reset}`);
    if (!allGood) {
      console.log(`   • Missing required files or incorrect structure`);
    }
    if (envVarsSet < 2) {
      console.log(`   • Set up API keys in .env.local file`);
      console.log(`   • Get API keys from:`);
      console.log(`     - FRED: https://fred.stlouisfed.org/docs/api/api_key.html`);
      console.log(`     - BLS: https://www.bls.gov/developers/api_signature_v2.htm`);
      console.log(`     - Census: https://api.census.gov/data/key_signup.html`);
    }
  }

  process.exit(allGood && envVarsSet >= 2 ? 0 : 1);
}

if (require.main === module) {
  main();
}
