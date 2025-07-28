# Redis Integration for Finance-Factors Dashboard

This document describes the comprehensive Redis integration implemented for the finance-factors dashboard, providing distributed caching, rate limiting, and performance optimization.

## Overview

The Redis integration provides:
- **Distributed Caching**: API responses, chart data, and computed results
- **Rate Limiting**: Distributed rate limiting for external API calls
- **Session Management**: User session data and preferences
- **Performance Monitoring**: Cache hit rates, latency metrics, and health checks
- **Scalability**: Horizontal scaling support for multiple application instances

## Architecture

### Core Components

1. **Redis Client** (`app/lib/redis.ts`)
   - Connection pooling and error handling
   - Automatic reconnection with exponential backoff
   - Environment-based configuration

2. **Cache Utilities** (`app/lib/redis-cache.ts`)
   - Generic caching functions with TTL support
   - Batch operations and cache warming
   - Statistics and monitoring

3. **Rate Limiting** (`app/lib/redis-rate-limit.ts`)
   - Sliding window, fixed window, and token bucket algorithms
   - Provider-specific configurations
   - Distributed rate limiting across instances

4. **API Integration** (`app/api/utils/proxy-utils.ts`)
   - Seamless integration with existing proxy services
   - Fallback to in-memory caching when Redis is unavailable
   - Backward compatibility

## Configuration

### Environment Variables

```bash
# Redis connection URL (required)
REDIS_URL=redis://default:password@host:port

# Optional: Redis configuration overrides
REDIS_CONNECT_TIMEOUT=10000
REDIS_COMMAND_TIMEOUT=5000
REDIS_MAX_RETRIES=3
```

### Rate Limiting Configuration

Default configurations for API providers:

```typescript
FRED: {
  windowMs: 60 * 1000,    // 1 minute
  maxRequests: 120,       // 120 requests per minute
  algorithm: 'sliding'
}

BLS: {
  windowMs: 60 * 1000,    // 1 minute
  maxRequests: 10,        // 10 requests per minute
  algorithm: 'fixed'
}

CENSUS: {
  windowMs: 60 * 1000,    // 1 minute
  maxRequests: 100,       // 100 requests per minute
  algorithm: 'sliding'
}

ALPHA_VANTAGE: {
  windowMs: 60 * 1000,    // 1 minute
  maxRequests: 5,         // 5 requests per minute
  algorithm: 'fixed'
}
```

## API Endpoints

### Health Check

**GET** `/api/health/redis`
- Redis connectivity and performance metrics
- Cache statistics and memory usage
- Rate limiting status

### Cache Management

**GET** `/api/cache`
- Get cache statistics and key information
- Query parameters: `keys`, `prefix`, `pattern`

**POST** `/api/cache`
- Set cache data or perform operations
- Actions: `set`, `clear`, `warm`

**DELETE** `/api/cache`
- Delete cache keys by pattern or prefix

**GET/PUT/DELETE** `/api/cache/[key]`
- Individual cache key management

### Rate Limiting

**GET** `/api/rate-limit`
- Get rate limiting status for providers
- Query parameters: `provider`, `identifier`

**POST** `/api/rate-limit`
- Reset rate limits or clear all limits
- Actions: `reset`, `clear-all`

**DELETE** `/api/rate-limit`
- Clear rate limits for specific providers

## Usage Examples

### Basic Caching

```typescript
import { setCacheData, getCacheData } from '@/lib/redis-cache';

// Cache API response
await setCacheData('api:fred:gdp', responseData, 1800, 'FRED API');

// Retrieve cached data
const cached = await getCacheData('api:fred:gdp');
```

### Rate Limiting

```typescript
import { checkRateLimit } from '@/lib/redis-rate-limit';

// Check if request is allowed
const result = await checkRateLimit('FRED', 'user123');
if (!result.allowed) {
  throw new Error('Rate limit exceeded');
}
```

### Cache Management

```typescript
import { clearCacheByPrefix, getCacheStats } from '@/lib/redis-cache';

// Clear all API response cache
await clearCacheByPrefix('api:response:');

// Get cache statistics
const stats = await getCacheStats();
console.log(`Total keys: ${stats.totalKeys}`);
```

## Monitoring and Observability

### Health Checks

The Redis health check endpoint provides:
- Connection status and latency
- Memory usage and performance metrics
- Cache hit/miss ratios
- Rate limiting statistics

### Cache Statistics

Monitor cache performance with:
- Total keys and memory usage
- Keys by prefix distribution
- Hit/miss ratios
- Average operation latency

### Rate Limiting Metrics

Track rate limiting with:
- Requests per provider
- Remaining quota
- Reset times
- Algorithm performance

## Fallback Strategy

The integration includes automatic fallback to in-memory caching when Redis is unavailable:

1. **Connection Failure**: Falls back to in-memory cache
2. **Operation Timeout**: Returns fallback values
3. **Redis Unavailable**: Continues with reduced functionality
4. **Graceful Degradation**: No service interruption

## Performance Optimization

### Cache Strategies

1. **API Response Caching**: 30-minute TTL for external API data
2. **Chart Data Caching**: 15-minute TTL for processed chart data
3. **Health Check Caching**: 5-minute TTL for system status
4. **User Session Caching**: 24-hour TTL for user preferences

### Rate Limiting Algorithms

1. **Sliding Window**: Smooth rate limiting for high-volume APIs
2. **Fixed Window**: Simple rate limiting for low-volume APIs
3. **Token Bucket**: Burst handling for variable load APIs

### Connection Pooling

- Persistent connections with keep-alive
- Automatic reconnection with exponential backoff
- Connection timeout and retry configuration
- Graceful shutdown handling

## Deployment Considerations

### Production Setup

1. **Redis Configuration**:
   - Enable persistence (RDB + AOF)
   - Configure memory limits and eviction policies
   - Set up monitoring and alerting

2. **Security**:
   - Use TLS/SSL for connections
   - Configure authentication and ACLs
   - Network security and firewall rules

3. **High Availability**:
   - Redis Sentinel or Cluster setup
   - Multiple Redis instances
   - Backup and recovery procedures

### Scaling

- Horizontal scaling with consistent hashing
- Read replicas for cache-heavy workloads
- Sharding strategies for large datasets
- Load balancing and failover

## Troubleshooting

### Common Issues

1. **Connection Timeouts**: Check network connectivity and Redis server status
2. **Memory Issues**: Monitor Redis memory usage and configure eviction policies
3. **Rate Limiting**: Verify rate limit configurations and reset times
4. **Cache Misses**: Check TTL settings and cache key generation

### Debug Tools

- Health check endpoint for system status
- Cache statistics for performance monitoring
- Rate limiting status for quota tracking
- Redis CLI for direct database inspection

## Migration Guide

### From In-Memory to Redis

1. **Install Dependencies**: `npm install redis`
2. **Configure Environment**: Set `REDIS_URL` environment variable
3. **Update Imports**: Replace in-memory cache imports
4. **Test Integration**: Verify functionality with health checks
5. **Monitor Performance**: Use monitoring endpoints

### Backward Compatibility

The integration maintains backward compatibility:
- Existing API endpoints continue to work
- Automatic fallback to in-memory caching
- No breaking changes to existing functionality
- Gradual migration support
