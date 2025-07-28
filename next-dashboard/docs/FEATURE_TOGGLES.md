# Feature Toggles: Redis and Prisma Service Control

This document explains how to enable/disable Redis caching and Prisma database functionality in the Finance Factors Dashboard without deleting code, allowing for easy re-enablement in the future.

## Overview

The application supports feature toggles for two main services:
- **Redis**: Caching layer for API responses and rate limiting
- **Prisma**: Database operations for user data, dashboards, and persistence

When disabled, these services gracefully fall back to alternative implementations:
- **Redis disabled**: Falls back to in-memory caching and direct API calls
- **Prisma disabled**: Skips database operations and returns mock/empty responses

## Environment Variables

### Current Configuration (.env.local)

```bash
# Feature Toggles (Service Control)
ENABLE_REDIS=false    # Redis caching disabled
ENABLE_PRISMA=false   # Prisma database disabled
```

### To Enable Services

```bash
# Enable Redis caching
ENABLE_REDIS=true

# Enable Prisma database
ENABLE_PRISMA=true
```

## How It Works

### Redis Feature Toggle

**File**: `lib/backend/lib/feature-toggles.ts`
```typescript
export function isRedisEnabled(): boolean {
  return process.env.ENABLE_REDIS === 'true';
}
```

**When Redis is disabled:**
- All Redis operations return immediately with fallback values
- API responses use in-memory caching instead of Redis
- Rate limiting uses in-memory fallback mechanisms
- Cache operations become no-ops but don't throw errors

**Affected Components:**
- `lib/backend/lib/redis-cache.ts` - All cache functions check `isRedisEnabled()`
- `lib/backend/lib/redis.ts` - Connection and availability checks
- `app/api/utils/proxy-utils.ts` - Proxy caching falls back to in-memory
- All API routes that use caching

### Prisma Feature Toggle

**File**: `lib/backend/lib/feature-toggles.ts`
```typescript
export function isPrismaEnabled(): boolean {
  return process.env.ENABLE_PRISMA === 'true';
}
```

**When Prisma is disabled:**
- Database client is set to `null`
- All database operations return `null` or empty results
- GraphQL resolvers throw "Database functionality is disabled" errors
- Health checks return "disabled" status

**Affected Components:**
- `lib/backend/lib/prisma.ts` - Client initialization and operations
- `app/api/graphql/resolvers.ts` - All database queries and mutations
- `lib/backend/lib/advanced-cache.ts` - Database caching layer
- Database health check endpoints

## API Behavior When Services Are Disabled

### Redis Disabled

**Cache API (`/api/cache`)**:
```json
{
  "error": "Redis disabled",
  "message": "Redis cache is disabled via feature toggle",
  "featureToggle": "ENABLE_REDIS=false"
}
```

**Redis Health (`/api/health/redis`)**:
```json
{
  "status": "disabled",
  "redis": {
    "connected": false,
    "error": "Redis functionality is disabled via feature toggle",
    "featureToggle": "ENABLE_REDIS=false"
  }
}
```

### Prisma Disabled

**Database Health (`/api/db-health`)**:
```json
{
  "status": "disabled",
  "database": {
    "status": "disabled",
    "error": "Prisma functionality is disabled via feature toggle",
    "featureToggle": "ENABLE_PRISMA=false"
  }
}
```

**GraphQL Queries**:
```json
{
  "errors": [
    {
      "message": "Database functionality is disabled"
    }
  ]
}
```

## Testing Disabled Services

### 1. Verify Environment Variables
```bash
# Check current status
curl http://localhost:3000/api/status | jq '.services'
```

### 2. Test Redis Disabled
```bash
# Should return disabled status
curl http://localhost:3000/api/health/redis

# Should return error
curl http://localhost:3000/api/cache
```

### 3. Test Prisma Disabled
```bash
# Should return disabled status
curl http://localhost:3000/api/db-health

# GraphQL should return error
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ me { id name } }"}'
```

### 4. Test Application Functionality
- Dashboard should load correctly
- Charts should display data using fallback generators
- API proxy should work with in-memory caching
- No errors should appear in browser console

## Re-enabling Services

### Step 1: Update Environment Variables

Edit `.env.local`:
```bash
# Enable Redis
ENABLE_REDIS=true

# Enable Prisma  
ENABLE_PRISMA=true
```

### Step 2: Restart Development Server

```bash
# Stop current server (Ctrl+C)
# Restart
npm run dev
```

### Step 3: Verify Services Are Enabled

```bash
# Check status
curl http://localhost:3000/api/status | jq '.services'

# Test Redis health
curl http://localhost:3000/api/health/redis

# Test database health
curl http://localhost:3000/api/db-health
```

## Troubleshooting

### Redis Connection Issues After Re-enabling

If Redis fails to connect after re-enabling:

1. **Check Redis URL**: Verify `REDIS_URL` in `.env.local`
2. **Test Connection**: Use Redis CLI or external tool
3. **Check Logs**: Look for connection errors in server logs
4. **Reset Circuit Breaker**: The Redis circuit breaker may need time to reset

### Database Connection Issues After Re-enabling

If Prisma fails to connect after re-enabling:

1. **Check Database URL**: Verify `DATABASE_URL` in `.env.local`
2. **Run Migrations**: `npx prisma migrate dev`
3. **Generate Client**: `npx prisma generate`
4. **Check Connection Limits**: Verify connection pool settings

### Application Still Using Fallbacks

If the application continues using fallbacks after re-enabling:

1. **Hard Refresh**: Clear browser cache and refresh
2. **Check Environment**: Ensure environment variables are loaded
3. **Restart Server**: Completely restart the development server
4. **Check Logs**: Look for feature toggle debug messages

## Development Workflow

### For Local Development (Services Disabled)
```bash
ENABLE_REDIS=false
ENABLE_PRISMA=false
```
- Faster startup time
- No external dependencies
- Uses mock data and in-memory caching

### For Integration Testing (Services Enabled)
```bash
ENABLE_REDIS=true
ENABLE_PRISMA=true
```
- Full functionality testing
- Real caching and database operations
- Production-like behavior

### For Production Deployment
```bash
ENABLE_REDIS=true
ENABLE_PRISMA=true
```
- All services enabled
- Full performance optimization
- Complete feature set

## Code Patterns

### Adding New Redis Operations

When adding new Redis functionality, always check the feature toggle:

```typescript
export async function newRedisOperation(): Promise<any> {
  // FEATURE TOGGLE: Skip Redis operations when disabled
  if (!isRedisEnabled()) {
    console.debug('Redis disabled - using fallback for newRedisOperation');
    return fallbackValue;
  }
  
  // Redis operation here
  return await executeRedisCommand(/* ... */);
}
```

### Adding New Prisma Operations

When adding new database functionality, always check the feature toggle:

```typescript
export async function newDatabaseOperation(): Promise<any> {
  // FEATURE TOGGLE: Check if Prisma is enabled
  if (!isPrismaEnabled() || !prisma) {
    console.debug('Prisma disabled - skipping newDatabaseOperation');
    return null;
  }
  
  // Database operation here
  return await prisma.model.operation(/* ... */);
}
```

## Monitoring and Observability

### Feature Toggle Status Endpoint

```bash
GET /api/status
```

Returns current feature toggle status:
```json
{
  "services": {
    "redis": {
      "enabled": false,
      "status": "disabled",
      "reason": "Redis functionality is disabled via ENABLE_REDIS environment variable"
    },
    "prisma": {
      "enabled": false,
      "status": "disabled", 
      "reason": "Prisma functionality is disabled via ENABLE_PRISMA environment variable"
    }
  }
}
```

### Debug Logging

When services are disabled, debug messages are logged:
- `Redis disabled - skipping cache set for key: ${key}`
- `Prisma disabled - skipping database health check`
- `Using fallback for ${operationName} (fallback mode active)`

These help track when fallback mechanisms are being used.
