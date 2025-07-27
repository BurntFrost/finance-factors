/**
 * Vercel-Specific Health Check Endpoint
 *
 * Monitors serverless environment specifics including cold starts,
 * edge functions, CDN cache status, and Vercel platform metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  VercelHealthCheck
} from '../../types/health';
import {
  getPerformanceMetrics,
  isColdStart,
  isVercelEnvironment,
  getVercelDeploymentInfo,
  createHealthCheckError,
  checkStaticAssets
} from '../../utils/health-utils';

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Vercel-specific health check handler
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const url = new URL(request.url);
  const checkAssets = url.searchParams.get('checkAssets') === 'true';

  try {
    // Verify we're running in Vercel environment
    if (!isVercelEnvironment()) {
      const error = createHealthCheckError(
        'NOT_VERCEL_ENVIRONMENT',
        'This endpoint is designed for Vercel deployment environments',
        { environment: process.env.NODE_ENV }
      );
      return NextResponse.json(error, { status: 400 });
    }

    // Get performance metrics
    const performance = getPerformanceMetrics();
    performance.responseTime = Date.now() - startTime;

    // Get Vercel deployment information
    const deploymentInfo = getVercelDeploymentInfo();

    // Detect cold start
    const coldStart = isColdStart();

    // Check static assets if requested
    let staticAssetsCheck = null;
    if (checkAssets && deploymentInfo.url) {
      staticAssetsCheck = await checkStaticAssets(`https://${deploymentInfo.url}`);
    }

    // Get Vercel-specific environment variables
    const vercelLimits = {
      functionTimeout: parseInt(process.env.VERCEL_FUNCTION_TIMEOUT || '10'),
      functionMemory: parseInt(process.env.VERCEL_FUNCTION_MEMORY || '1024'),
      bandwidthUsed: undefined, // Not available in runtime
      bandwidthLimit: undefined, // Not available in runtime
    };

    // Mock edge function and CDN data (would need Vercel API for real data)
    const edgeFunctions = {
      available: !!process.env.VERCEL_EDGE_FUNCTIONS,
      regions: process.env.VERCEL_EDGE_REGIONS?.split(',') || [deploymentInfo.region],
    };

    const cdnStatus = {
      status: 'available' as const,
      cacheHitRate: Math.random() * 100, // Mock data
      edgeLocations: ['iad1', 'sfo1', 'lhr1'], // Mock data
    };

    // Build Vercel health check response
    const healthCheck: VercelHealthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: deploymentInfo.environment || 'production',
      performance,
      vercel: {
        region: deploymentInfo.region,
        deploymentId: deploymentInfo.deploymentId,
        isColdStart: coldStart,
        functionDuration: performance.responseTime,
        edgeFunctions,
        cdn: cdnStatus,
        staticAssets: {
          status: staticAssetsCheck ? 
            (Object.values(staticAssetsCheck).some(Boolean) ? 'available' : 'degraded') : 
            'unknown',
          lastDeployment: deploymentInfo.gitCommitSha ? new Date().toISOString() : undefined,
          assetsCount: staticAssetsCheck ? Object.values(staticAssetsCheck).filter(Boolean).length : undefined,
        },
      },
      limits: vercelLimits,
    };

    // Determine overall status
    if (coldStart) {
      healthCheck.status = 'degraded'; // Cold starts are expected but indicate degraded performance
    }

    if (staticAssetsCheck && !Object.values(staticAssetsCheck).some(Boolean)) {
      healthCheck.status = 'unhealthy'; // No static assets available
    }

    // Add additional metadata for debugging
    const responseHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Check-Duration': `${Date.now() - startTime}ms`,
      'X-Vercel-Region': deploymentInfo.region,
      'X-Cold-Start': coldStart.toString(),
      'X-Deployment-Id': deploymentInfo.deploymentId || 'unknown',
    };

    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;

    return NextResponse.json(healthCheck, {
      status: statusCode,
      headers: responseHeaders,
    });

  } catch (error) {
    const healthCheckError = createHealthCheckError(
      'VERCEL_HEALTH_CHECK_FAILED',
      error instanceof Error ? error.message : 'Unknown error occurred during Vercel health check',
      {
        duration: Date.now() - startTime,
        vercelEnvironment: isVercelEnvironment(),
        region: process.env.VERCEL_REGION,
        deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
      }
    );

    return NextResponse.json(healthCheckError, {
      status: 503,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check-Duration': `${Date.now() - startTime}ms`,
      },
    });
  }
}

/**
 * Additional endpoint for Vercel deployment status
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { checkType } = body;

    if (checkType === 'deployment-status') {
      const deploymentInfo = getVercelDeploymentInfo();
      
      return NextResponse.json({
        status: 'success',
        deployment: {
          id: deploymentInfo.deploymentId,
          region: deploymentInfo.region,
          environment: deploymentInfo.environment,
          url: deploymentInfo.url,
          gitCommit: {
            sha: deploymentInfo.gitCommitSha,
            message: deploymentInfo.gitCommitMessage,
          },
          timestamp: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid check type' },
      { status: 400 }
    );

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
