#!/usr/bin/env node

/**
 * API Proxy Test Script
 * 
 * Tests the Vercel serverless API proxy functionality
 * Run with: node test-proxy.js
 */

const https = require('https');
const http = require('http');
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
      if (key && value && !key.startsWith('#')) {
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
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Finance-Factors-Proxy-Test/1.0',
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
    };

    if (options.data) {
      requestOptions.headers['Content-Type'] = 'application/json';
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.data);
    }

    const req = client.request(requestOptions, (res) => {
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
    
    if (options.data) {
      req.write(options.data);
    }
    
    req.end();
  });
}

async function testProxyHealth(baseUrl) {
  console.log(`\n${colors.blue}Testing API Proxy Health...${colors.reset}`);
  
  try {
    const response = await makeRequest(`${baseUrl}/api/proxy/health`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      console.log(`${colors.green}✅ Health check passed${colors.reset}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Services configured:`);
      
      Object.entries(data.services).forEach(([service, info]) => {
        const status = info.configured ? colors.green + '✅' : colors.red + '❌';
        console.log(`     ${service}: ${status} ${info.status}${colors.reset}`);
      });
      
      return true;
    } else {
      console.log(`${colors.red}❌ Health check failed: HTTP ${response.statusCode}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Health check error: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testProxyData(baseUrl, dataType) {
  console.log(`\n${colors.blue}Testing ${dataType} data via proxy...${colors.reset}`);
  
  try {
    const requestData = JSON.stringify({
      dataType: dataType,
      useCache: false, // Force fresh data for testing
    });
    
    const response = await makeRequest(`${baseUrl}/api/proxy/data`, {
      method: 'POST',
      data: requestData,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      
      if (data.success && data.data) {
        console.log(`${colors.green}✅ Successfully fetched ${dataType}${colors.reset}`);
        console.log(`   Source: ${data.source}`);
        console.log(`   Data points: ${data.data.length}`);
        console.log(`   Sample data: ${data.data.slice(0, 3).map(d => `${d.date}: ${d.value}`).join(', ')}`);
        
        if (data.metadata?.rateLimit) {
          console.log(`   Rate limit remaining: ${data.metadata.rateLimit.remaining}`);
        }
        
        return true;
      } else {
        console.log(`${colors.red}❌ Proxy returned error: ${data.error}${colors.reset}`);
        return false;
      }
    } else {
      console.log(`${colors.red}❌ HTTP ${response.statusCode}: ${response.data}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Request failed: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testDirectComparison(dataType) {
  console.log(`\n${colors.blue}Comparing direct API vs proxy for ${dataType}...${colors.reset}`);
  
  // Test direct FRED API (should fail with CORS in browser, but work in Node.js)
  try {
    const fredApiKey = process.env.FRED_API_KEY || process.env.NEXT_PUBLIC_FRED_API_KEY;
    if (!fredApiKey) {
      console.log(`${colors.yellow}⚠️  No FRED API key found, skipping direct comparison${colors.reset}`);
      return;
    }
    
    const directUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=CSUSHPISA&api_key=${fredApiKey}&file_type=json&limit=5`;
    const directResponse = await makeRequest(directUrl);
    
    if (directResponse.statusCode === 200) {
      const directData = JSON.parse(directResponse.data);
      console.log(`${colors.green}✅ Direct API works (Node.js environment)${colors.reset}`);
      console.log(`   Direct API observations: ${directData.observations?.length || 0}`);
    } else {
      console.log(`${colors.red}❌ Direct API failed: HTTP ${directResponse.statusCode}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Direct API error: ${error.message}${colors.reset}`);
  }
}

async function main() {
  console.log(`${colors.bold}${colors.blue}Finance Factors Dashboard - API Proxy Test${colors.reset}\n`);
  
  // Determine base URL
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  
  console.log(`Testing proxy at: ${baseUrl}`);
  
  const results = {
    health: false,
    housePrices: false,
    comparison: false,
  };
  
  // Test health endpoint
  results.health = await testProxyHealth(baseUrl);
  
  // Test house prices data (FRED API)
  if (results.health) {
    results.housePrices = await testProxyData(baseUrl, 'house-prices');
  }
  
  // Test direct API comparison
  await testDirectComparison('house-prices');
  
  // Summary
  console.log(`\n${colors.bold}${colors.blue}Test Results Summary:${colors.reset}`);
  console.log(`   Health Check: ${results.health ? colors.green + '✅ PASSED' : colors.red + '❌ FAILED'}${colors.reset}`);
  console.log(`   House Prices: ${results.housePrices ? colors.green + '✅ PASSED' : colors.red + '❌ FAILED'}${colors.reset}`);
  
  if (results.health && results.housePrices) {
    console.log(`\n${colors.green}🎉 API Proxy is working correctly!${colors.reset}`);
    console.log(`   The proxy successfully bypasses CORS restrictions.`);
    console.log(`   Your dashboard should now be able to fetch live data.`);
  } else {
    console.log(`\n${colors.red}❌ API Proxy has issues${colors.reset}`);
    console.log(`   Check your environment variables and Vercel deployment.`);
  }
  
  console.log(`\n${colors.blue}Next steps:${colors.reset}`);
  console.log(`   • Deploy to Vercel: vercel --prod`);
  console.log(`   • Test in browser: Visit your dashboard and check for live data`);
  console.log(`   • Monitor logs: Check Vercel function logs for any errors`);
  
  process.exit(results.health && results.housePrices ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}
