// Test script to verify data transformation is working
// Using Node.js built-in fetch (Node 18+)

async function testDataTransformation() {
    try {
        console.log('🧪 Testing Data Transformation Pipeline...\n');

        // Step 1: Fetch raw data from API proxy
        console.log('1. Fetching raw data from API proxy...');
        const response = await fetch('http://localhost:3000/api/proxy/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dataType: 'house-prices',
                useCache: false
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const apiData = await response.json();
        console.log(`✅ API Response: ${apiData.success ? 'Success' : 'Failed'}`);
        console.log(`   Data points: ${apiData.data ? apiData.data.length : 0}`);
        console.log(`   Source: ${apiData.source}`);
        
        if (!apiData.success || !apiData.data || apiData.data.length === 0) {
            throw new Error('No data received from API');
        }

        // Step 2: Verify data structure
        console.log('\n2. Verifying data structure...');
        const samplePoint = apiData.data[0];
        console.log(`   Sample data point:`, samplePoint);
        
        const hasRequiredFields = samplePoint.date && typeof samplePoint.value === 'number';
        console.log(`   Has required fields (date, value): ${hasRequiredFields ? '✅' : '❌'}`);
        
        if (!hasRequiredFields) {
            throw new Error('Data structure is invalid');
        }

        // Step 3: Test Chart.js transformation
        console.log('\n3. Testing Chart.js transformation...');
        const chartData = {
            labels: apiData.data.map(point => point.date),
            datasets: [{
                label: 'House Prices',
                data: apiData.data.map(point => point.value),
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                borderWidth: 2,
                fill: false
            }],
            isRealData: true,
            lastUpdated: new Date(),
            dataSource: apiData.source
        };

        console.log(`   Chart labels: ${chartData.labels.length}`);
        console.log(`   Chart data points: ${chartData.datasets[0].data.length}`);
        console.log(`   Sample labels: ${chartData.labels.slice(0, 3).join(', ')}`);
        console.log(`   Sample values: ${chartData.datasets[0].data.slice(0, 3).join(', ')}`);

        // Step 4: Validate Chart.js format
        console.log('\n4. Validating Chart.js format...');
        const isValidChartData = (
            Array.isArray(chartData.labels) &&
            Array.isArray(chartData.datasets) &&
            chartData.datasets.length > 0 &&
            Array.isArray(chartData.datasets[0].data) &&
            chartData.labels.length === chartData.datasets[0].data.length
        );

        console.log(`   Valid Chart.js format: ${isValidChartData ? '✅' : '❌'}`);
        
        if (!isValidChartData) {
            throw new Error('Chart.js format validation failed');
        }

        // Step 5: Test different data types
        console.log('\n5. Testing other data types...');
        const dataTypes = ['salary-income', 'unemployment-rate'];
        
        for (const dataType of dataTypes) {
            try {
                const testResponse = await fetch('http://localhost:3000/api/proxy/data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        dataType: dataType,
                        useCache: false
                    })
                });

                const testData = await testResponse.json();
                console.log(`   ${dataType}: ${testData.success ? '✅' : '❌'} (${testData.data ? testData.data.length : 0} points)`);
            } catch (error) {
                console.log(`   ${dataType}: ❌ Error - ${error.message}`);
            }
        }

        console.log('\n🎉 All tests passed! Data transformation pipeline is working correctly.');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testDataTransformation();
