# Health Check System Documentation

## Overview

The Finance Factors Dashboard includes a comprehensive health check system specifically designed for Vercel deployment and hosting. The system provides multiple endpoints for monitoring different aspects of the application's health and performance.

## Health Check Endpoints

### 1. Main API Health Check
**Endpoint:** `/api/health` (Enhanced)
**Method:** GET
**Purpose:** Comprehensive API service health monitoring

#### Query Parameters
- `detailed=true` - Include additional database and cache information
- `testApis=true` - Perform actual connectivity tests to external APIs

#### Response Format
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-07-27T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "performance": {
    "responseTime": 150,
    "memoryUsage": {
      "used": 52428800,
      "total": 134217728,
      "percentage": 39
    },
    "uptime": 3600
  },
  "services": {
    "fred": {
      "configured": true,
      "status": "available",
      "lastChecked": "2024-07-27T10:30:00.000Z",
      "responseTime": 120
    },
    "bls": { /* ... */ },
    "census": { /* ... */ },
    "alphaVantage": { /* ... */ }
  },
  "cache": {
    "enabled": true,
    "size": 0,
    "hitRate": 85.5
  }
}
```

### 2. Vercel-Specific Health Check
**Endpoint:** `/api/health/vercel`
**Method:** GET
**Purpose:** Serverless environment monitoring

#### Query Parameters
- `checkAssets=true` - Verify static asset accessibility

#### Response Format
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-07-27T10:30:00.000Z",
  "performance": { /* ... */ },
  "vercel": {
    "region": "iad1",
    "deploymentId": "dpl_abc123",
    "isColdStart": false,
    "functionDuration": 150,
    "edgeFunctions": {
      "available": true,
      "regions": ["iad1", "sfo1"]
    },
    "cdn": {
      "status": "available",
      "cacheHitRate": 92.3,
      "edgeLocations": ["iad1", "sfo1", "lhr1"]
    },
    "staticAssets": {
      "status": "available",
      "lastDeployment": "2024-07-27T10:00:00.000Z",
      "assetsCount": 3
    }
  },
  "limits": {
    "functionTimeout": 10,
    "functionMemory": 1024
  }
}
```

### 3. Dashboard Functionality Health Check
**Endpoint:** `/api/health/dashboard`
**Method:** GET
**Purpose:** Verify dashboard components and features

#### Query Parameters
- `webVitals=true` - Include Web Vitals metrics
- `testDataSources=true` - Test actual data source connectivity

#### Response Format
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-07-27T10:30:00.000Z",
  "performance": { /* ... */ },
  "dashboard": {
    "chartJs": {
      "loaded": true,
      "version": "4.5.0",
      "registeredCharts": ["line", "bar", "pie", "doughnut"]
    },
    "dataSources": {
      "live": {
        "status": "available",
        "lastSuccessfulFetch": "2024-07-27T10:25:00.000Z",
        "failureCount": 0
      },
      "sample": {
        "status": "available",
        "dataIntegrity": true
      }
    },
    "interactiveFeatures": {
      "hoverOverlays": true,
      "cardAnimations": true,
      "dropdownSelections": true,
      "dataSourceSwitching": true
    },
    "components": {
      "automaticChart": true,
      "dataStatusPill": true,
      "summaryCards": true,
      "lazyLoading": true
    }
  },
  "webVitals": {
    "lcp": 1200,
    "fid": 50,
    "cls": 0.05,
    "fcp": 800,
    "ttfb": 200
  }
}
```

### 4. Deployment Verification Health Check
**Endpoint:** `/api/health/deployment`
**Method:** GET
**Purpose:** Post-deployment verification

#### Query Parameters
- `checkRoutes=true` - Test route accessibility
- `checkAssets=true` - Verify static asset delivery
- `checkSecurity=true` - Check security headers

#### Response Format
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-07-27T10:30:00.000Z",
  "performance": { /* ... */ },
  "deployment": {
    "routes": {
      "api": {
        "health": true,
        "data": true,
        "proxy": true
      },
      "pages": {
        "home": true,
        "dashboard": true
      }
    },
    "staticAssets": {
      "css": true,
      "js": true,
      "images": true,
      "fonts": false
    },
    "environmentVariables": {
      "required": ["NEXT_PUBLIC_FRED_API_KEY", "..."],
      "missing": [],
      "configured": 4,
      "total": 4
    },
    "build": {
      "successful": true,
      "timestamp": "2024-07-27T10:00:00.000Z"
    }
  },
  "security": {
    "headers": {
      "cors": true,
      "csp": false,
      "hsts": false
    },
    "apiKeys": {
      "exposed": true,
      "encrypted": true
    }
  }
}
```

### 5. Monitoring Integration Health Check
**Endpoint:** `/api/health/monitoring`
**Method:** GET
**Purpose:** Aggregated monitoring for external services

#### Query Parameters
- `format=json|prometheus` - Response format
- `alerts=true|false` - Include alert information

#### Response Format (JSON)
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-07-27T10:30:00.000Z",
  "performance": { /* ... */ },
  "summary": {
    "totalChecks": 6,
    "passedChecks": 5,
    "failedChecks": 0,
    "warningChecks": 1
  },
  "checks": [
    {
      "name": "Environment Variables",
      "status": "healthy",
      "message": "4/4 configured",
      "duration": 5,
      "timestamp": "2024-07-27T10:30:00.000Z",
      "metadata": { /* ... */ }
    }
  ],
  "alerts": [
    {
      "level": "warning",
      "message": "High memory usage: 85%",
      "component": "system",
      "timestamp": "2024-07-27T10:30:00.000Z"
    }
  ]
}
```

#### Response Format (Prometheus)
```
finance_factors_health_status 2
finance_factors_health_checks_total 6
finance_factors_health_checks_passed 5
finance_factors_health_checks_failed 0
finance_factors_health_checks_warnings 1
finance_factors_response_time_ms 150
finance_factors_memory_usage_percent 39
finance_factors_uptime_seconds 3600
finance_factors_alerts_total 1
```

## Status Codes

- **200 OK** - Healthy or degraded status
- **503 Service Unavailable** - Unhealthy status
- **400 Bad Request** - Invalid parameters or not in Vercel environment
- **500 Internal Server Error** - Unexpected error

## Health Status Definitions

- **healthy** - All systems operational
- **degraded** - Some issues detected but service functional
- **unhealthy** - Critical issues affecting service
- **unknown** - Unable to determine status

## Usage Examples

### Basic Health Check
```bash
curl https://finance-factors.vercel.app/api/health
```

### Detailed API Health Check with External Testing
```bash
curl "https://finance-factors.vercel.app/api/health?detailed=true&testApis=true"
```

### Vercel Environment Check with Asset Verification
```bash
curl "https://finance-factors.vercel.app/api/health/vercel?checkAssets=true"
```

### Dashboard Functionality Check with Web Vitals
```bash
curl "https://finance-factors.vercel.app/api/health/dashboard?webVitals=true&testDataSources=true"
```

### Complete Deployment Verification
```bash
curl "https://finance-factors.vercel.app/api/health/deployment?checkRoutes=true&checkAssets=true&checkSecurity=true"
```

### Monitoring Integration (Prometheus Format)
```bash
curl "https://finance-factors.vercel.app/api/health/monitoring?format=prometheus"
```

## Integration with Monitoring Services

### Uptime Monitoring
Use the main `/api/health` endpoint for basic uptime monitoring:
```bash
# Simple uptime check
curl -f https://finance-factors.vercel.app/api/health
```

### Performance Monitoring
Use the monitoring endpoint for detailed metrics:
```bash
# Get performance metrics
curl "https://finance-factors.vercel.app/api/health/monitoring?alerts=true"
```

### Prometheus/Grafana Integration
```bash
# Scrape metrics for Prometheus
curl "https://finance-factors.vercel.app/api/health/monitoring?format=prometheus"
```

### Custom Monitoring Scripts
```bash
# Check specific components
curl -X POST https://finance-factors.vercel.app/api/health/monitoring \
  -H "Content-Type: application/json" \
  -d '{"action": "custom-check", "customChecks": ["Memory Usage", "API Services Configuration"]}'
```

## Error Handling

All endpoints return structured error responses:
```json
{
  "status": "error",
  "timestamp": "2024-07-27T10:30:00.000Z",
  "error": {
    "code": "HEALTH_CHECK_FAILED",
    "message": "Detailed error message",
    "details": { /* Additional context */ }
  },
  "performance": { /* Partial metrics if available */ }
}
```

## Security Considerations

- Health check endpoints are publicly accessible for monitoring
- Sensitive information (API keys, internal details) is not exposed
- Rate limiting should be implemented at the infrastructure level
- CORS headers are configured for cross-origin monitoring tools

## Best Practices

1. **Regular Monitoring**: Check health endpoints every 1-5 minutes
2. **Alert Thresholds**: Set up alerts for degraded status lasting > 5 minutes
3. **Comprehensive Checks**: Use detailed checks during deployment verification
4. **Performance Tracking**: Monitor response times and memory usage trends
5. **Error Analysis**: Review error details for troubleshooting deployment issues
