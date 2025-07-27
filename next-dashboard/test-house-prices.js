#!/usr/bin/env node

/**
 * Focused Test for House Prices Live Data
 * 
 * Tests the specific FRED API endpoint used for house prices in the dashboard
 * This will help debug the live data functionality
 */

const https = require('https');
const { URL } = require('url');

// Load environment variables from .env.local
try {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '.env.local');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value && key.startsWith('NEXT_PUBLIC_')) {
        process.env[key] = value;
      }
    });
  }
} catch (error) {
  console.log('No .env.local file found, using environment variables');
}

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Finance-Factors-Dashboard/1.0',
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testHousePricesAPI() {
  console.log(`${colors.bold}${colors.blue}Testing House Prices Live Data (FRED API)${colors.reset}\n`);
  
  const apiKey = process.env.NEXT_PUBLIC_FRED_API_KEY;
  
  if (!apiKey) {
    console.log(`${colors.red}❌ FRED API key not found in environment variables${colors.reset}`);
    console.log('   Please set NEXT_PUBLIC_FRED_API_KEY in .env.local');
    return false;
  }
  
  console.log(`${colors.green}✅ API key found${colors.reset}`);
  
  // Test the exact endpoint used by the dashboard for house prices
  const seriesId = 'CSUSHPISA'; // Case-Shiller U.S. National Home Price Index
  const baseUrl = 'https://api.stlouisfed.org/fred';
  
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
    sort_order: 'desc',
    limit: '120', // 10 years of monthly data
  });
  
  const url = `${baseUrl}/series/observations?${params}`;
  
  console.log(`${colors.blue}Testing endpoint:${colors.reset}`);
  console.log(`   Series: ${seriesId} (Case-Shiller U.S. National Home Price Index)`);
  console.log(`   URL: ${url.replace(apiKey, '***')}`);
  
  try {
    console.log(`\n${colors.yellow}Making request...${colors.reset}`);
    const response = await makeRequest(url);
    
    if (response.statusCode !== 200) {
      console.log(`${colors.red}❌ HTTP Error: ${response.statusCode}${colors.reset}`);
      console.log(`   Response: ${response.data.substring(0, 500)}`);
      return false;
    }
    
    let data;
    try {
      data = JSON.parse(response.data);
    } catch (parseError) {
      console.log(`${colors.red}❌ Invalid JSON response${colors.reset}`);
      console.log(`   Response: ${response.data.substring(0, 500)}`);
      return false;
    }
    
    // Check for FRED API specific errors
    if (data.error_code) {
      console.log(`${colors.red}❌ FRED API Error: ${data.error_message}${colors.reset}`);
      return false;
    }
    
    if (!data.observations || !Array.isArray(data.observations)) {
      console.log(`${colors.red}❌ No observations found in response${colors.reset}`);
      console.log(`   Response structure: ${JSON.stringify(Object.keys(data), null, 2)}`);
      return false;
    }
    
    console.log(`${colors.green}✅ Successfully retrieved data!${colors.reset}`);
    console.log(`\n${colors.bold}Data Summary:${colors.reset}`);
    console.log(`   Total observations: ${data.observations.length}`);
    console.log(`   Date range: ${data.observation_start} to ${data.observation_end}`);
    console.log(`   Units: ${data.units}`);
    
    // Show recent data points
    const validObservations = data.observations.filter(obs => obs.value !== '.' && obs.value !== '');
    console.log(`   Valid data points: ${validObservations.length}`);
    
    if (validObservations.length > 0) {
      console.log(`\n${colors.bold}Recent Data Points:${colors.reset}`);
      validObservations.slice(0, 5).forEach((obs, index) => {
        console.log(`   ${index + 1}. ${obs.date}: ${obs.value}`);
      });
      
      // Test data transformation (like the dashboard does)
      const transformedData = validObservations
        .map(obs => ({
          date: obs.date,
          value: parseFloat(obs.value),
          label: new Date(obs.date).getFullYear().toString(),
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      console.log(`\n${colors.bold}Transformed Data Sample:${colors.reset}`);
      transformedData.slice(-5).forEach((point, index) => {
        console.log(`   ${transformedData.length - 4 + index}. ${point.date}: ${point.value} (${point.label})`);
      });
      
      return true;
    } else {
      console.log(`${colors.yellow}⚠️  No valid data points found (all values are '.' or empty)${colors.reset}`);
      return false;
    }
    
  } catch (error) {
    console.log(`${colors.red}❌ Request failed: ${error.message}${colors.reset}`);
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log(`   This appears to be a network connectivity issue.`);
    } else if (error.message.includes('certificate')) {
      console.log(`   This appears to be an SSL/TLS certificate issue.`);
    }
    
    return false;
  }
}

async function testDashboardIntegration() {
  console.log(`\n${colors.bold}${colors.blue}Testing Dashboard Integration${colors.reset}\n`);
  
  try {
    // Simulate how the dashboard loads the API service
    const fredApiPath = './app/services/fredApiService.js';
    
    console.log(`${colors.yellow}Checking if fredApiService can be loaded...${colors.reset}`);
    
    // Check if the file exists
    const fs = require('fs');
    const path = require('path');
    const servicePath = path.join(__dirname, 'app', 'services', 'fredApiService.ts');
    
    if (!fs.existsSync(servicePath)) {
      console.log(`${colors.red}❌ fredApiService.ts not found at: ${servicePath}${colors.reset}`);
      return false;
    }
    
    console.log(`${colors.green}✅ fredApiService.ts found${colors.reset}`);
    
    // Check the data type mapping
    const dataSourcePath = path.join(__dirname, 'app', 'types', 'dataSource.ts');
    if (fs.existsSync(dataSourcePath)) {
      const content = fs.readFileSync(dataSourcePath, 'utf8');
      if (content.includes('house-prices') && content.includes('CSUSHPISA')) {
        console.log(`${colors.green}✅ House prices mapping found in dataSource.ts${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠️  House prices mapping may be missing in dataSource.ts${colors.reset}`);
      }
    }
    
    return true;
    
  } catch (error) {
    console.log(`${colors.red}❌ Dashboard integration test failed: ${error.message}${colors.reset}`);
    return false;
  }
}

async function main() {
  console.log(`${colors.bold}House Prices Live Data Test${colors.reset}`);
  console.log(`${colors.blue}Testing the specific data source used by the finance-factors dashboard${colors.reset}\n`);
  
  const apiTest = await testHousePricesAPI();
  const integrationTest = await testDashboardIntegration();
  
  console.log(`\n${colors.bold}${colors.blue}Final Results:${colors.reset}`);
  console.log(`   API Test: ${apiTest ? colors.green + '✅ PASSED' : colors.red + '❌ FAILED'}${colors.reset}`);
  console.log(`   Integration Test: ${integrationTest ? colors.green + '✅ PASSED' : colors.red + '❌ FAILED'}${colors.reset}`);
  
  if (apiTest && integrationTest) {
    console.log(`\n${colors.green}🎉 House prices live data should be working!${colors.reset}`);
    console.log(`   The FRED API is accessible and returning valid data.`);
    console.log(`   Next step: Test the dashboard in the browser.`);
  } else {
    console.log(`\n${colors.red}❌ Issues found with house prices live data${colors.reset}`);
    if (!apiTest) {
      console.log(`   • API connectivity or data issues`);
    }
    if (!integrationTest) {
      console.log(`   • Dashboard integration issues`);
    }
  }
  
  process.exit(apiTest && integrationTest ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}
