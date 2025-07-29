/**
 * Data Source Testing API Endpoint
 * 
 * Provides endpoints for testing and validating the dual data source system,
 * including running test suites and individual scenarios.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  dualDataSourceTester,
  TestScenario,
  TestConfig,
  runDualDataSourceTests,
} from '@/shared/utils/dualDataSourceTester';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    switch (action) {
      case 'status':
        return NextResponse.json({
          status: 'ready',
          message: 'Data source testing endpoint is ready',
          availableScenarios: Object.values(TestScenario),
          timestamp: new Date().toISOString(),
        });

      case 'results':
        const results = dualDataSourceTester.getTestResults();
        return NextResponse.json({
          results: results.map(result => ({
            ...result,
            startTime: result.startTime.toISOString(),
            endTime: result.endTime.toISOString(),
          })),
          totalTests: results.length,
          timestamp: new Date().toISOString(),
        });

      case 'clear':
        dualDataSourceTester.clearTestResults();
        return NextResponse.json({
          success: true,
          message: 'Test results cleared',
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in data source testing endpoint:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config, scenario, dataType } = body;

    switch (action) {
      case 'run-suite':
        console.log('🧪 Starting test suite via API...');
        
        const testConfig: Partial<TestConfig> = {
          dataTypes: config?.dataTypes || ['house-prices', 'unemployment-rate'],
          iterations: config?.iterations || 2,
          delayBetweenRequests: config?.delayBetweenRequests || 500,
          timeoutMs: config?.timeoutMs || 5000,
          enableLogging: config?.enableLogging !== false,
          simulateNetworkConditions: config?.simulateNetworkConditions || false,
        };

        const results = await runDualDataSourceTests(testConfig);
        
        return NextResponse.json({
          success: true,
          message: 'Test suite completed',
          results: results.map(result => ({
            ...result,
            startTime: result.startTime.toISOString(),
            endTime: result.endTime.toISOString(),
          })),
          summary: {
            totalTests: results.length,
            passedTests: results.filter(r => r.success).length,
            failedTests: results.filter(r => !r.success).length,
            failoverEvents: results.filter(r => r.failoverOccurred).length,
            fallbackUsage: results.filter(r => r.fallbackUsed).length,
          },
          timestamp: new Date().toISOString(),
        });

      case 'run-scenario':
        if (!scenario || !dataType) {
          return NextResponse.json(
            { error: 'Missing scenario or dataType parameters' },
            { status: 400 }
          );
        }

        console.log(`🧪 Running test scenario: ${scenario} for ${dataType}`);
        
        const scenarioConfig: TestConfig = {
          dataTypes: [dataType],
          iterations: config?.iterations || 3,
          delayBetweenRequests: config?.delayBetweenRequests || 1000,
          timeoutMs: config?.timeoutMs || 10000,
          enableLogging: config?.enableLogging !== false,
          simulateNetworkConditions: config?.simulateNetworkConditions || false,
        };

        const result = await dualDataSourceTester.runTestScenario(
          scenario as TestScenario,
          dataType,
          scenarioConfig
        );

        return NextResponse.json({
          success: true,
          message: 'Test scenario completed',
          result: {
            ...result,
            startTime: result.startTime.toISOString(),
            endTime: result.endTime.toISOString(),
          },
          timestamp: new Date().toISOString(),
        });

      case 'validate-system':
        console.log('🔍 Running system validation...');
        
        // Run a comprehensive validation
        const validationConfig: Partial<TestConfig> = {
          dataTypes: ['house-prices', 'unemployment-rate', 'gdp-growth'],
          iterations: 1,
          delayBetweenRequests: 200,
          timeoutMs: 8000,
          enableLogging: true,
          simulateNetworkConditions: false,
        };

        const validationResults = await runDualDataSourceTests(validationConfig);
        
        // Analyze results for system health
        const totalTests = validationResults.length;
        const passedTests = validationResults.filter(r => r.success).length;
        const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
        
        const systemHealth = {
          overall: passRate >= 90 ? 'healthy' : passRate >= 70 ? 'degraded' : 'unhealthy',
          passRate,
          failoverWorking: validationResults.some(r => r.failoverOccurred),
          fallbackWorking: validationResults.some(r => r.fallbackUsed),
          averageResponseTime: validationResults.reduce((sum, r) => sum + r.metrics.averageResponseTime, 0) / totalTests,
        };

        return NextResponse.json({
          success: true,
          message: 'System validation completed',
          systemHealth,
          results: validationResults.map(result => ({
            ...result,
            startTime: result.startTime.toISOString(),
            endTime: result.endTime.toISOString(),
          })),
          recommendations: generateRecommendations(systemHealth, validationResults),
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error running data source tests:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to run tests',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(systemHealth: any, results: any[]): string[] {
  const recommendations: string[] = [];

  if (systemHealth.passRate < 90) {
    recommendations.push('System pass rate is below 90%. Review failed test scenarios and improve error handling.');
  }

  if (!systemHealth.failoverWorking) {
    recommendations.push('Failover mechanism not detected. Verify that primary-to-secondary provider switching is working correctly.');
  }

  if (!systemHealth.fallbackWorking) {
    recommendations.push('Fallback mechanism not detected. Ensure historical data generators are functioning as backup.');
  }

  if (systemHealth.averageResponseTime > 5000) {
    recommendations.push('Average response time is high (>5s). Consider optimizing API calls and caching strategies.');
  }

  const errorPatterns = new Map<string, number>();
  results.forEach(result => {
    result.errors.forEach((error: string) => {
      const count = errorPatterns.get(error) || 0;
      errorPatterns.set(error, count + 1);
    });
  });

  if (errorPatterns.size > 0) {
    const topError = Array.from(errorPatterns.entries())
      .sort(([,a], [,b]) => b - a)[0];
    recommendations.push(`Most common error: "${topError[0]}" (${topError[1]} occurrences). Address this issue first.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('System is performing well. Continue monitoring for any degradation.');
  }

  return recommendations;
}
