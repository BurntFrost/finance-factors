/**
 * Test script for OECD API integration
 * 
 * This script tests the OECD API endpoints to verify they work correctly
 * Run with: node scripts/test-oecd-api.js
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Test OECD API endpoints
 */
async function testOECDAPI() {
  console.log('🏛️ Testing OECD API Integration...\n');

  const testCases = [
    {
      name: 'US GDP Data',
      dataType: 'oecd-gdp-us',
      description: 'GDP data for United States from OECD'
    },
    {
      name: 'US Employment Data',
      dataType: 'oecd-employment-us',
      description: 'Employment statistics for United States from OECD'
    },
    {
      name: 'US Productivity Data',
      dataType: 'oecd-productivity-us',
      description: 'Productivity metrics for United States from OECD'
    },
    {
      name: 'US Interest Rates Data',
      dataType: 'oecd-interest-rates-us',
      description: 'Interest rates for United States from OECD'
    }
  ];

  let successCount = 0;
  let totalTests = testCases.length;

  for (const testCase of testCases) {
    try {
      console.log(`📊 Testing: ${testCase.name}`);
      console.log(`   Description: ${testCase.description}`);
      
      const response = await fetch(`${API_BASE_URL}/api/proxy/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataType: testCase.dataType,
          timeRange: {
            start: new Date('2020-01-01').toISOString(),
            end: new Date('2023-12-31').toISOString(),
          },
          useCache: false, // Disable cache for testing
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data && Array.isArray(data.data)) {
        console.log(`   ✅ Success: Retrieved ${data.data.length} data points`);
        console.log(`   📈 Sample data: ${JSON.stringify(data.data.slice(0, 2), null, 2)}`);
        console.log(`   🏷️  Source: ${data.source}`);
        console.log(`   ⏱️  Response time: ${response.headers.get('X-Response-Time') || 'N/A'}`);
        successCount++;
      } else {
        console.log(`   ❌ Failed: ${data.error || 'No data returned'}`);
        console.log(`   📄 Response: ${JSON.stringify(data, null, 2)}`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('📋 Test Summary:');
  console.log(`   Total tests: ${totalTests}`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Failed: ${totalTests - successCount}`);
  console.log(`   Success rate: ${((successCount / totalTests) * 100).toFixed(1)}%`);

  if (successCount === totalTests) {
    console.log('\n🎉 All OECD API tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some OECD API tests failed. Check the logs above.');
    process.exit(1);
  }
}

/**
 * Test direct OECD API (without proxy)
 */
async function testDirectOECDAPI() {
  console.log('🔗 Testing direct OECD API access...\n');

  try {
    // Test a simple OECD endpoint
    const response = await fetch('https://sdmx.oecd.org/public/rest/data/OECD.SDD.NAD,DSD_NAAG@DF_NAAG_I/USA.GDP.CPC.A?format=jsondata&startPeriod=2020&endPeriod=2023');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.data && data.data.dataSets) {
      console.log('✅ Direct OECD API access successful');
      console.log(`📊 Retrieved data structure with ${data.data.dataSets.length} dataset(s)`);
      console.log(`📈 Sample structure: ${JSON.stringify(Object.keys(data.data), null, 2)}`);
    } else {
      console.log('❌ Unexpected response format from OECD API');
      console.log(`📄 Response: ${JSON.stringify(data, null, 2)}`);
    }

  } catch (error) {
    console.log(`❌ Direct API test failed: ${error.message}`);
  }

  console.log('');
}

/**
 * Test both World Bank and OECD APIs together
 */
async function testBothAPIs() {
  console.log('🌐 Testing both World Bank and OECD APIs together...\n');

  const testCases = [
    {
      name: 'World Bank US GDP',
      dataType: 'world-bank-gdp-us',
      expectedProvider: 'WORLD_BANK'
    },
    {
      name: 'OECD US GDP',
      dataType: 'oecd-gdp-us',
      expectedProvider: 'OECD'
    },
    {
      name: 'World Bank US Inflation',
      dataType: 'world-bank-inflation-us',
      expectedProvider: 'WORLD_BANK'
    },
    {
      name: 'OECD US Employment',
      dataType: 'oecd-employment-us',
      expectedProvider: 'OECD'
    }
  ];

  let successCount = 0;

  for (const testCase of testCases) {
    try {
      console.log(`📊 Testing: ${testCase.name}`);
      
      const response = await fetch(`${API_BASE_URL}/api/proxy/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataType: testCase.dataType,
          timeRange: {
            start: new Date('2020-01-01').toISOString(),
            end: new Date('2023-12-31').toISOString(),
          },
          useCache: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && Array.isArray(data.data)) {
          console.log(`   ✅ Success: ${data.data.length} data points from ${data.source}`);
          successCount++;
        } else {
          console.log(`   ❌ Failed: ${data.error || 'No data'}`);
        }
      } else {
        console.log(`   ❌ HTTP Error: ${response.status}`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n📋 Combined API Test Summary: ${successCount}/${testCases.length} passed\n`);
}

// Run tests
async function main() {
  console.log('🚀 Starting OECD API Integration Tests\n');
  
  // Test direct API access first
  await testDirectOECDAPI();
  
  // Test through our proxy
  await testOECDAPI();
  
  // Test both APIs together
  await testBothAPIs();
}

main().catch(console.error);
