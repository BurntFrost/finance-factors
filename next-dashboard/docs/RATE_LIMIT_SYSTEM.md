# Rate Limit System Documentation

## Overview

The Finance Factors Dashboard now includes a comprehensive rate limit tracking and circuit breaker system that automatically handles API rate limits and prevents unnecessary API calls during cooldown periods.

## Key Features

### 1. Rate Limit Tracking
- **24-hour cooldown periods** for rate-limited provider/dataType combinations
- **Persistent storage** in Redis with in-memory fallback
- **Extended cooldown** for consecutive rate limits (configurable multiplier)
- **Automatic cleanup** of old rate limit events

### 2. Enhanced Circuit Breaker
- **Integration with rate limit tracker** for persistent state
- **Multiple states**: closed, open, half-open, rate-limited
- **Automatic recovery** after successful requests
- **Cross-instance synchronization** via Redis

### 3. Automatic Fallback
- **Seamless fallback** to historical data during rate limit periods
- **No user-visible errors** when APIs are rate limited
- **Intelligent provider switching** when multiple providers are available

### 4. Comprehensive Monitoring
- **Detailed logging** of all rate limit events
- **Circuit breaker state tracking** with timestamps
- **Monitoring statistics** and reporting
- **Alert conditions** for critical situations

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Proxy      │    │   External API  │
│   Components    │    │   Services       │    │   (FRED, etc.)  │
└─────────┬───────┘    └─────────┬────────┘    └─────────┬───────┘
          │                      │                       │
          │ Check Circuit        │ API Call              │ Rate Limit
          │ Breaker Status       │                       │ Response (429)
          │                      │                       │
          v                      v                       v
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Circuit Breaker │    │ Enhanced Circuit │    │ Rate Limit      │
│ Service (FE)    │◄──►│ Breaker (BE)     │◄──►│ Tracker         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
          │                      │                       │
          │                      │                       │
          v                      v                       v
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Historical Data │    │ Rate Limit       │    │ Redis Cache     │
│ Fallback        │    │ Monitor          │    │ (Persistent)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Usage

### API Proxy Services

The system is automatically integrated into all API proxy services (FRED, BLS, Census, Alpha Vantage). No manual intervention is required.

```typescript
// Example: FRED API proxy automatically handles rate limits
const response = await fredProxyService.fetchSeries('treasury-2y');
// If rate limited, circuit breaker blocks future calls for 24 hours
// Frontend automatically falls back to historical data
```

### Frontend Components

Components using the AutomaticDataSourceProvider automatically benefit from rate limit protection:

```typescript
const { fetchData } = useAutomaticDataSource();

// This call will automatically:
// 1. Check circuit breaker status
// 2. Use historical data if rate limited
// 3. Log all events for monitoring
const data = await fetchData({ dataType: 'treasury-2y' });
```

### Manual Testing

Use the test API endpoints to manually trigger and test rate limit functionality:

```bash
# Check current status
curl "http://localhost:3000/api/test/rate-limit?action=status&provider=FRED&dataType=treasury-2y"

# Trigger a rate limit event
curl "http://localhost:3000/api/test/rate-limit?action=trigger&provider=FRED&dataType=treasury-2y"

# Clear rate limit state
curl "http://localhost:3000/api/test/rate-limit?action=clear&provider=FRED&dataType=treasury-2y"

# Get monitoring statistics
curl "http://localhost:3000/api/test/rate-limit?action=stats"

# Trigger multiple rate limits
curl -X POST "http://localhost:3000/api/test/rate-limit" \
  -H "Content-Type: application/json" \
  -d '{"action": "bulk-trigger", "provider": "FRED", "dataType": "treasury-2y", "count": 5}'
```

## Configuration

### Rate Limit Tracker Configuration

```typescript
const config = {
  cooldownPeriodMs: 24 * 60 * 60 * 1000, // 24 hours
  maxConsecutiveRateLimits: 3, // Threshold for extended cooldown
  extendedCooldownMultiplier: 2, // Double cooldown for repeated limits
  cleanupIntervalMs: 60 * 60 * 1000, // Clean up every hour
};
```

### Circuit Breaker Configuration

```typescript
const config = {
  failureThreshold: 3, // Open circuit after 3 failures
  recoveryTimeoutMs: 60000, // 1 minute recovery timeout
  halfOpenMaxAttempts: 1, // Max attempts in half-open state
  rateLimitCooldownMs: 24 * 60 * 60 * 1000, // 24 hours for rate limits
  persistState: true, // Persist state in Redis
  stateExpirationMs: 7 * 24 * 60 * 60 * 1000, // Keep state for 7 days
};
```

## Monitoring

### Circuit Breaker Status API

```bash
# Get all circuit breaker statuses
GET /api/circuit-breaker/status

# Get status for specific provider
GET /api/circuit-breaker/status?provider=FRED

# Get status for specific provider/dataType
GET /api/circuit-breaker/status?provider=FRED&dataType=treasury-2y

# Clear circuit breaker state
POST /api/circuit-breaker/status
{
  "provider": "FRED",
  "dataType": "treasury-2y",
  "action": "clear"
}
```

### Monitoring Events

The system logs detailed events for:
- Rate limit hits
- Circuit breaker state changes
- Fallback activations
- Recovery events
- API call success/failure

### Vercel Logs

Rate limit events appear in Vercel logs with this format:

```
[RATE_LIMIT] Rate limit exceeded for FRED:treasury-2y {
  provider: 'FRED',
  dataType: 'treasury-2y',
  timestamp: '2025-07-30T01:58:09.275Z',
  metadata: { statusCode: 429, consecutiveRateLimits: 1 }
}
```

## Troubleshooting

### Common Issues

1. **Rate limits not being detected**
   - Check that API responses include proper error messages or status codes
   - Verify that `isRateLimit` detection logic matches your API's error format

2. **Circuit breaker not persisting across restarts**
   - Ensure Redis is properly configured and accessible
   - Check that `isRedisEnabled()` returns true in production

3. **Frontend not falling back to historical data**
   - Verify that the AutomaticDataSourceProvider is properly configured
   - Check that historical data generators are working correctly

### Debug Commands

```bash
# Check Redis connection
curl "http://localhost:3000/api/test/rate-limit?action=stats"

# Verify circuit breaker state
curl "http://localhost:3000/api/circuit-breaker/status"

# Test rate limit detection
curl "http://localhost:3000/api/test/rate-limit?action=trigger&provider=FRED&dataType=treasury-2y"

# Clear all state for testing
curl "http://localhost:3000/api/test/rate-limit?action=clear&provider=FRED&dataType=treasury-2y"
```

## Best Practices

1. **Monitor rate limit events** regularly to identify patterns
2. **Set up alerts** for high rate limit frequencies
3. **Test fallback behavior** periodically to ensure it works correctly
4. **Review cooldown periods** and adjust based on API provider policies
5. **Use historical data generators** that provide realistic fallback data

## Future Enhancements

- **Predictive rate limiting** based on usage patterns
- **Dynamic cooldown adjustment** based on API provider feedback
- **Cross-provider load balancing** to distribute requests
- **Real-time dashboard** for monitoring rate limit status
- **Integration with external alerting systems** (PagerDuty, Slack, etc.)
