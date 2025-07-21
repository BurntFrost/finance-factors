#!/usr/bin/env node

/**
 * API Testing Script
 * 
 * Tests all configured APIs to verify they're working correctly
 * Run with: npm run test:apis
 */

const https = require('https');
const { URL } = require('url');

// Load environment variables from .env.local if it exists
try {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '..', '.env.local');
  
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

// API configurations
const APIs = {
  FRED: {
    name: 'Federal Reserve Economic Data (FRED)',
    baseUrl: 'https://api.stlouisfed.org/fred',
    apiKey: process.env.NEXT_PUBLIC_FRED_API_KEY,
    testEndpoint: '/series/observations?series_id=GDP&api_key={API_KEY}&file_type=json&limit=1',
    required: false,
  },
  BLS: {
    name: 'Bureau of Labor Statistics (BLS)',
    baseUrl: 'https://api.bls.gov/publicAPI/v2',
    apiKey: process.env.NEXT_PUBLIC_BLS_API_KEY,
    testEndpoint: '/timeseries/data/',
    testData: JSON.stringify({
      seriesid: ['LNS14000000'],
      startyear: '2024',
      endyear: '2024',
      ...(process.env.NEXT_PUBLIC_BLS_API_KEY && { registrationkey: process.env.NEXT_PUBLIC_BLS_API_KEY }),
    }),
    method: 'POST',
    required: false,
  },
  CENSUS: {
    name: 'U.S. Census Bureau',
    baseUrl: 'https://api.census.gov/data',
    apiKey: process.env.NEXT_PUBLIC_CENSUS_API_KEY,
    testEndpoint: '/2023/acs/acs5?get=B01003_001E,NAME&for=us:*' + 
                  (process.env.NEXT_PUBLIC_CENSUS_API_KEY ? `&key=${process.env.NEXT_PUBLIC_CENSUS_API_KEY}` : ''),
    required: false,
  },
  ALPHA_VANTAGE: {
    name: 'Alpha Vantage',
    baseUrl: 'https://www.alphavantage.co',
    apiKey: process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY,
    testEndpoint: '/query?function=REAL_GDP&apikey={API_KEY}&datatype=json',
    required: false,
  },
};

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

    if (options.data) {
      requestOptions.headers['Content-Type'] = 'application/json';
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.data);
    }

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
    
    if (options.data) {
      req.write(options.data);
    }
    
    req.end();
  });
}

async function testAPI(apiName, config) {
  console.log(`\n${colors.blue}Testing ${config.name}...${colors.reset}`);
  
  if (!config.apiKey && config.required) {
    console.log(`${colors.red}❌ API key not configured${colors.reset}`);
    return { success: false, error: 'API key required but not configured' };
  }
  
  if (!config.apiKey) {
    console.log(`${colors.yellow}⚠️  API key not configured (optional)${colors.reset}`);
  }

  try {
    let url = config.baseUrl + config.testEndpoint;
    let options = {};
    
    // Replace API key placeholder
    if (config.apiKey && url.includes('{API_KEY}')) {
      url = url.replace('{API_KEY}', config.apiKey);
    }
    
    // Handle POST requests (BLS)
    if (config.method === 'POST') {
      options.method = 'POST';
      options.data = config.testData;
      options.headers = {
        'Content-Type': 'application/json',
      };
    }

    console.log(`   Making request to: ${url.replace(config.apiKey || '', '***')}`);
    
    const response = await makeRequest(url, options);
    
    if (response.statusCode === 200) {
      try {
        const data = JSON.parse(response.data);
        
        // Check for API-specific success indicators
        let isSuccess = true;
        let message = 'Response received successfully';
        
        if (apiName === 'BLS' && data.status !== 'REQUEST_SUCCEEDED') {
          isSuccess = false;
          message = `BLS API error: ${data.message?.join(', ') || 'Unknown error'}`;
        } else if (apiName === 'ALPHA_VANTAGE' && data['Error Message']) {
          isSuccess = false;
          message = `Alpha Vantage error: ${data['Error Message']}`;
        } else if (apiName === 'ALPHA_VANTAGE' && data['Note']) {
          isSuccess = false;
          message = `Alpha Vantage rate limit: ${data['Note']}`;
        }
        
        if (isSuccess) {
          console.log(`${colors.green}✅ ${message}${colors.reset}`);
          
          // Show sample data
          if (apiName === 'FRED' && data.observations) {
            console.log(`   Sample: ${data.observations.length} observations, latest: ${data.observations[0]?.value}`);
          } else if (apiName === 'BLS' && data.Results?.series) {
            console.log(`   Sample: ${data.Results.series.length} series, ${data.Results.series[0]?.data?.length || 0} data points`);
          } else if (apiName === 'CENSUS' && Array.isArray(data)) {
            console.log(`   Sample: ${data.length - 1} records (excluding header)`);
          } else if (apiName === 'ALPHA_VANTAGE' && data.data) {
            console.log(`   Sample: ${data.data.length} data points`);
          }
          
          return { success: true, data };
        } else {
          console.log(`${colors.red}❌ ${message}${colors.reset}`);
          return { success: false, error: message };
        }
        
      } catch (parseError) {
        console.log(`${colors.red}❌ Invalid JSON response${colors.reset}`);
        console.log(`   Response: ${response.data.substring(0, 200)}...`);
        return { success: false, error: 'Invalid JSON response' };
      }
    } else {
      console.log(`${colors.red}❌ HTTP ${response.statusCode}${colors.reset}`);
      console.log(`   Response: ${response.data.substring(0, 200)}`);
      return { success: false, error: `HTTP ${response.statusCode}` };
    }
    
  } catch (error) {
    console.log(`${colors.red}❌ Request failed: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log(`${colors.bold}${colors.blue}Finance Factors Dashboard - API Testing${colors.reset}\n`);
  console.log('Testing configured APIs...\n');
  
  const results = {};
  
  for (const [apiName, config] of Object.entries(APIs)) {
    results[apiName] = await testAPI(apiName, config);
  }
  
  // Summary
  console.log(`\n${colors.bold}${colors.blue}Summary:${colors.reset}`);
  
  const configured = Object.entries(APIs).filter(([name, config]) => config.apiKey).length;
  const successful = Object.values(results).filter(r => r.success).length;
  const total = Object.keys(APIs).length;
  
  console.log(`\n📊 APIs configured: ${configured}/${total}`);
  console.log(`✅ APIs working: ${successful}/${configured || total}`);
  
  if (configured === 0) {
    console.log(`\n${colors.yellow}⚠️  No API keys configured. The dashboard will use sample data.${colors.reset}`);
    console.log(`   To configure APIs, copy .env.example to .env.local and add your API keys.`);
  } else if (successful === configured) {
    console.log(`\n${colors.green}🎉 All configured APIs are working correctly!${colors.reset}`);
  } else {
    console.log(`\n${colors.red}⚠️  Some APIs are not working. Check the errors above.${colors.reset}`);
  }
  
  console.log(`\n${colors.blue}Next steps:${colors.reset}`);
  console.log(`   • Run "npm run dev" to start the development server`);
  console.log(`   • Visit http://localhost:3000 to see your dashboard`);
  console.log(`   • Push to GitHub to deploy to GitHub Pages`);
  
  process.exit(successful === configured ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}
