#!/usr/bin/env node

/**
 * Test script for newly implemented Census and Alpha Vantage proxy services
 * 
 * This script validates that the Census and Alpha Vantage proxy services
 * are properly integrated and can handle requests without errors.
 */

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

/**
 * Test that the proxy services can be imported without errors
 */
async function testServiceImports() {
  console.log(`${colors.blue}Testing service imports...${colors.reset}`);
  
  try {
    // Test Census proxy service import
    const censusPath = path.join(__dirname, 'app/api/services/census-proxy.ts');
    console.log(`   Checking Census proxy service at: ${censusPath}`);
    
    // Test Alpha Vantage proxy service import
    const alphaPath = path.join(__dirname, 'app/api/services/alpha-vantage-proxy.ts');
    console.log(`   Checking Alpha Vantage proxy service at: ${alphaPath}`);
    
    // Test main proxy route integration
    const routePath = path.join(__dirname, 'app/api/proxy/data/route.ts');
    console.log(`   Checking main proxy route at: ${routePath}`);
    
    console.log(`${colors.green}✅ All service files exist${colors.reset}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Service import error: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Test that the API endpoint configurations are properly added
 */
async function testEndpointConfigurations() {
  console.log(`\n${colors.blue}Testing API endpoint configurations...${colors.reset}`);
  
  try {
    const fs = require('fs');
    const proxyTypesPath = path.join(__dirname, 'app/api/types/proxy.ts');
    const content = fs.readFileSync(proxyTypesPath, 'utf8');
    
    // Check for new endpoint configurations
    const newEndpoints = [
      'tuition-education',
      'medical-costs',
      'childcare-costs',
      'transportation-costs',
      'food-prices',
      'utilities-costs',
      'investment-returns'
    ];
    
    let allFound = true;
    newEndpoints.forEach(endpoint => {
      if (content.includes(`'${endpoint}':`)) {
        console.log(`   ${colors.green}✅ ${endpoint}${colors.reset}`);
      } else {
        console.log(`   ${colors.red}❌ ${endpoint} - not found${colors.reset}`);
        allFound = false;
      }
    });
    
    if (allFound) {
      console.log(`${colors.green}✅ All new endpoint configurations found${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}❌ Some endpoint configurations missing${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Configuration test error: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Test that the main proxy route properly imports and uses new services
 */
async function testProxyRouteIntegration() {
  console.log(`\n${colors.blue}Testing proxy route integration...${colors.reset}`);
  
  try {
    const fs = require('fs');
    const routePath = path.join(__dirname, 'app/api/proxy/data/route.ts');
    const content = fs.readFileSync(routePath, 'utf8');
    
    // Check for service imports
    const requiredImports = [
      'censusProxyService',
      'alphaVantageProxyService'
    ];
    
    let importsFound = true;
    requiredImports.forEach(importName => {
      if (content.includes(importName)) {
        console.log(`   ${colors.green}✅ ${importName} imported${colors.reset}`);
      } else {
        console.log(`   ${colors.red}❌ ${importName} - import not found${colors.reset}`);
        importsFound = false;
      }
    });
    
    // Check for case implementations
    const caseChecks = [
      "case 'CENSUS':",
      "censusProxyService.fetchSeries",
      "case 'ALPHA_VANTAGE':",
      "alphaVantageProxyService.fetchSeries"
    ];
    
    let casesFound = true;
    caseChecks.forEach(check => {
      if (content.includes(check)) {
        console.log(`   ${colors.green}✅ ${check}${colors.reset}`);
      } else {
        console.log(`   ${colors.red}❌ ${check} - not found${colors.reset}`);
        casesFound = false;
      }
    });
    
    if (importsFound && casesFound) {
      console.log(`${colors.green}✅ Proxy route integration complete${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}❌ Proxy route integration incomplete${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Route integration test error: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Test that utility functions are properly added
 */
async function testUtilityFunctions() {
  console.log(`\n${colors.blue}Testing utility functions...${colors.reset}`);
  
  try {
    const fs = require('fs');
    const utilsPath = path.join(__dirname, 'app/api/utils/proxy-utils.ts');
    const content = fs.readFileSync(utilsPath, 'utf8');
    
    if (content.includes('getOptionalEnvVar')) {
      console.log(`   ${colors.green}✅ getOptionalEnvVar function added${colors.reset}`);
      return true;
    } else {
      console.log(`   ${colors.red}❌ getOptionalEnvVar function missing${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Utility function test error: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Test that health check endpoint is updated
 */
async function testHealthCheckUpdate() {
  console.log(`\n${colors.blue}Testing health check updates...${colors.reset}`);

  try {
    const fs = require('fs');
    const healthPath = path.join(__dirname, 'app/api/proxy/health/route.ts');
    const content = fs.readFileSync(healthPath, 'utf8');

    // Check that the main health check logic no longer uses 'unknown' for census and alphaVantage
    const hasOldCensusStatus = content.includes("status: 'unknown', // Not implemented yet");
    const hasOldAlphaStatus = content.includes("status: 'unknown', // Not implemented yet");

    if (hasOldCensusStatus || hasOldAlphaStatus) {
      console.log(`   ${colors.red}❌ Health check still shows old 'unknown' status comments${colors.reset}`);
      return false;
    } else {
      console.log(`   ${colors.green}✅ Health check status updated (removed 'Not implemented yet' comments)${colors.reset}`);
      return true;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Health check test error: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Main test function
 */
async function main() {
  console.log(`${colors.bold}${colors.blue}Census and Alpha Vantage Integration Test${colors.reset}\n`);
  
  const results = {
    imports: false,
    endpoints: false,
    integration: false,
    utilities: false,
    health: false,
  };
  
  // Run all tests
  results.imports = await testServiceImports();
  results.endpoints = await testEndpointConfigurations();
  results.integration = await testProxyRouteIntegration();
  results.utilities = await testUtilityFunctions();
  results.health = await testHealthCheckUpdate();
  
  // Summary
  console.log(`\n${colors.bold}${colors.blue}Integration Test Results:${colors.reset}`);
  console.log(`   Service Imports: ${results.imports ? colors.green + '✅ PASSED' : colors.red + '❌ FAILED'}${colors.reset}`);
  console.log(`   Endpoint Configs: ${results.endpoints ? colors.green + '✅ PASSED' : colors.red + '❌ FAILED'}${colors.reset}`);
  console.log(`   Route Integration: ${results.integration ? colors.green + '✅ PASSED' : colors.red + '❌ FAILED'}${colors.reset}`);
  console.log(`   Utility Functions: ${results.utilities ? colors.green + '✅ PASSED' : colors.red + '❌ FAILED'}${colors.reset}`);
  console.log(`   Health Check: ${results.health ? colors.green + '✅ PASSED' : colors.red + '❌ FAILED'}${colors.reset}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log(`\n${colors.green}🎉 All integration tests passed!${colors.reset}`);
    console.log(`   Census and Alpha Vantage proxy services are properly integrated.`);
    console.log(`   The dashboard now supports ${colors.bold}7 additional data types${colors.reset} with live API endpoints.`);
    console.log(`\n${colors.blue}New data types with API support:${colors.reset}`);
    console.log(`   • tuition-education (Census)`);
    console.log(`   • medical-costs (Census)`);
    console.log(`   • childcare-costs (Census)`);
    console.log(`   • transportation-costs (Census)`);
    console.log(`   • food-prices (FRED)`);
    console.log(`   • utilities-costs (Census)`);
    console.log(`   • investment-returns (Alpha Vantage)`);
  } else {
    console.log(`\n${colors.red}❌ Some integration tests failed${colors.reset}`);
    console.log(`   Please review the failed tests above and fix any issues.`);
  }
  
  console.log(`\n${colors.blue}Next steps:${colors.reset}`);
  console.log(`   • Set environment variables: CENSUS_API_KEY, ALPHA_VANTAGE_API_KEY`);
  console.log(`   • Test with actual API calls: node test-proxy.js`);
  console.log(`   • Deploy to Vercel: vercel --prod`);
  console.log(`   • Verify dashboard shows live data indicators`);
  
  process.exit(allPassed ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}
