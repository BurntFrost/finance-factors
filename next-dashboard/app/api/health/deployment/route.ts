/**
 * Deployment Verification Health Check Endpoint
 *
 * Post-deployment checks for route accessibility, static assets,
 * environment variables, and overall deployment health
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  DeploymentHealthCheck, 
  HealthCheckError,
  HealthCheckResult
} from '../../types/health';
import {
  getPerformanceMetrics,
  createHealthCheckError,
  createHealthCheckResult,
  determineOverallStatus,
  checkStaticAssets,
  checkEnvironmentVariables,
  testApiConnectivity,
  isVercelEnvironment,
  getVercelDeploymentInfo
} from '../../utils/health-utils';

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Check API route accessibility
 */
async function checkApiRoutes(baseUrl: string) {
  const routes = {
    health: false,
    data: false,
    proxy: false,
  };

  try {
    const checks = await Promise.allSettled([
      testApiConnectivity(`${baseUrl}/api/health`, 5000),
      testApiConnectivity(`${baseUrl}/api/proxy/data`, 5000),
      testApiConnectivity(`${baseUrl}/api/proxy/health`, 5000),
    ]);

    routes.health = checks[0].status === 'fulfilled' && checks[0].value.status === 'available';
    routes.data = checks[1].status === 'fulfilled' && checks[1].value.status === 'available';
    routes.proxy = checks[2].status === 'fulfilled' && checks[2].value.status === 'available';
  } catch (error) {
    // Routes check failed, all remain false
  }

  return routes;
}

/**
 * Check page route accessibility
 */
async function checkPageRoutes(baseUrl: string) {
  const routes = {
    home: false,
    dashboard: false,
  };

  try {
    const checks = await Promise.allSettled([
      testApiConnectivity(baseUrl, 5000),
      testApiConnectivity(`${baseUrl}/dashboard`, 5000),
    ]);

    routes.home = checks[0].status === 'fulfilled' && checks[0].value.status === 'available';
    routes.dashboard = checks[1].status === 'fulfilled' && checks[1].value.status === 'available';
  } catch (error) {
    // Page routes check failed, all remain false
  }

  return routes;
}

/**
 * Check security headers
 */
async function checkSecurityHeaders(baseUrl: string) {
  const headers = {
    cors: false,
    csp: false,
    hsts: false,
  };

  try {
    const response = await fetch(baseUrl, { method: 'HEAD' });
    const responseHeaders = response.headers;

    headers.cors = responseHeaders.has('access-control-allow-origin');
    headers.csp = responseHeaders.has('content-security-policy');
    headers.hsts = responseHeaders.has('strict-transport-security');
  } catch (error) {
    // Security headers check failed, all remain false
  }

  return headers;
}

/**
 * Check API key security
 */
function checkApiKeySecurity() {
  const apiKeys = {
    exposed: false,
    encrypted: true, // Assume encrypted in Vercel environment
  };

  // Check if any API keys are accidentally exposed in client-side code
  // This is a basic check - in production you'd want more sophisticated detection
  const envVars = Object.keys(process.env);
  const publicApiKeys = envVars.filter(key => 
    key.startsWith('NEXT_PUBLIC_') && 
    key.includes('API_KEY') &&
    process.env[key]
  );

  // API keys should be public for client-side usage in this case
  // but we check if they're properly configured
  apiKeys.exposed = publicApiKeys.length > 0;

  return apiKeys;
}

/**
 * Mock build information (would come from CI/CD in real implementation)
 */
function getBuildInfo() {
  const deploymentInfo = isVercelEnvironment() ? getVercelDeploymentInfo() : null;
  
  return {
    successful: true, // Assume successful if we're running
    timestamp: deploymentInfo?.gitCommitSha ? new Date().toISOString() : undefined,
    duration: undefined, // Not available at runtime
    errors: [],
    warnings: [],
  };
}

/**
 * Deployment verification health check handler
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const url = new URL(request.url);
  const checkRoutes = url.searchParams.get('checkRoutes') === 'true';
  const checkAssets = url.searchParams.get('checkAssets') === 'true';
  const checkSecurity = url.searchParams.get('checkSecurity') === 'true';

  try {
    // Get performance metrics
    const performance = getPerformanceMetrics();
    
    // Get base URL for checks
    const baseUrl = url.origin;

    // Check environment variables
    const environmentVariables = checkEnvironmentVariables();

    // Check routes if requested
    let apiRoutes = { health: false, data: false, proxy: false };
    let pageRoutes = { home: false, dashboard: false };
    if (checkRoutes) {
      [apiRoutes, pageRoutes] = await Promise.all([
        checkApiRoutes(baseUrl),
        checkPageRoutes(baseUrl),
      ]);
    }

    // Check static assets if requested
    let staticAssets = { css: false, js: false, images: false, fonts: false };
    if (checkAssets) {
      staticAssets = await checkStaticAssets(baseUrl);
    }

    // Check security if requested
    let securityHeaders = { cors: false, csp: false, hsts: false };
    if (checkSecurity) {
      securityHeaders = await checkSecurityHeaders(baseUrl);
    }

    // Check API key security
    const apiKeys = checkApiKeySecurity();

    // Get build information
    const build = getBuildInfo();

    // Update performance metrics
    performance.responseTime = Date.now() - startTime;

    // Build deployment health check response
    const healthCheck: DeploymentHealthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      performance,
      deployment: {
        routes: {
          api: apiRoutes,
          pages: pageRoutes,
        },
        staticAssets,
        environmentVariables,
        build,
      },
      security: {
        headers: securityHeaders,
        apiKeys,
      },
    };

    // Create individual check results for status determination
    const checks: HealthCheckResult[] = [
      createHealthCheckResult(
        'Environment Variables',
        environmentVariables.missing.length === 0 ? 'healthy' : 'degraded',
        `${environmentVariables.configured}/${environmentVariables.total} configured`,
        startTime,
        { missing: environmentVariables.missing }
      ),
      createHealthCheckResult(
        'Build Status',
        build.successful ? 'healthy' : 'unhealthy',
        build.successful ? 'Build completed successfully' : 'Build failed',
        startTime
      ),
    ];

    if (checkRoutes) {
      checks.push(
        createHealthCheckResult(
          'API Routes',
          Object.values(apiRoutes).every(Boolean) ? 'healthy' : 'degraded',
          `${Object.values(apiRoutes).filter(Boolean).length}/3 routes accessible`,
          startTime
        ),
        createHealthCheckResult(
          'Page Routes',
          Object.values(pageRoutes).every(Boolean) ? 'healthy' : 'degraded',
          `${Object.values(pageRoutes).filter(Boolean).length}/2 pages accessible`,
          startTime
        )
      );
    }

    if (checkAssets) {
      checks.push(
        createHealthCheckResult(
          'Static Assets',
          Object.values(staticAssets).some(Boolean) ? 'healthy' : 'degraded',
          `${Object.values(staticAssets).filter(Boolean).length}/4 asset types available`,
          startTime
        )
      );
    }

    if (checkSecurity) {
      checks.push(
        createHealthCheckResult(
          'Security Headers',
          securityHeaders.cors ? 'healthy' : 'degraded',
          'Security headers checked',
          startTime,
          securityHeaders
        )
      );
    }

    healthCheck.status = determineOverallStatus(checks);

    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;

    return NextResponse.json(healthCheck, {
      status: statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check-Duration': `${Date.now() - startTime}ms`,
        'X-Deployment-Status': healthCheck.status,
        'X-Environment-Variables': `${environmentVariables.configured}/${environmentVariables.total}`,
      },
    });

  } catch (error) {
    const healthCheckError = createHealthCheckError(
      'DEPLOYMENT_HEALTH_CHECK_FAILED',
      error instanceof Error ? error.message : 'Unknown error occurred during deployment health check',
      {
        duration: Date.now() - startTime,
        environment: process.env.NODE_ENV,
        vercel: isVercelEnvironment(),
      }
    );

    return NextResponse.json(healthCheckError, {
      status: 503,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check-Duration': `${Date.now() - startTime}ms`,
      },
    });
  }
}

/**
 * POST endpoint for triggering specific deployment checks
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { checkType, options = {} } = body;

    switch (checkType) {
      case 'quick-check':
        // Perform a quick deployment verification
        const envVars = checkEnvironmentVariables();
        const build = getBuildInfo();
        
        return NextResponse.json({
          status: 'success',
          result: {
            environmentVariables: envVars.missing.length === 0,
            buildStatus: build.successful,
            timestamp: new Date().toISOString(),
          },
        });

      case 'full-check':
        // Redirect to GET with all parameters
        const url = new URL(request.url);
        url.searchParams.set('checkRoutes', 'true');
        url.searchParams.set('checkAssets', 'true');
        url.searchParams.set('checkSecurity', 'true');
        
        return NextResponse.redirect(url.toString());

      default:
        return NextResponse.json(
          { error: 'Invalid check type' },
          { status: 400 }
        );
    }

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to process deployment check request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
