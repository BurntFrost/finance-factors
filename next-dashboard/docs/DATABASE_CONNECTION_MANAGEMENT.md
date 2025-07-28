# Database Connection Management

This document explains how to manage database connections in the Finance Factors Dashboard to prevent connection limit issues.

## Overview

The application uses Prisma with Vercel Postgres (via Prisma Accelerate) with strict connection limits:
- **DATABASE_URL**: 3 connections maximum
- **DIRECT_URL**: 2 connections maximum (for migrations)

## Connection Limit Issues

### Symptoms
- Error: `FATAL: too many connections for role "prisma_migration"`
- API requests failing with database connection errors
- Slow response times
- Redis pipeline failures causing fallback to database

### Root Causes
1. **Multiple Prisma Clients**: Creating multiple Prisma client instances
2. **Connection Leaks**: Not properly closing connections after use
3. **Concurrent Requests**: Too many simultaneous database operations
4. **Long-Running Queries**: Queries that hold connections for extended periods
5. **Redis Failures**: When Redis is unavailable, more database operations occur

## Solutions Implemented

### 1. Prisma Client Configuration
- **Connection Pooling**: Limited to 3 connections maximum
- **Timeouts**: 10-second connection timeout, 20-second pool timeout
- **Singleton Pattern**: Single Prisma client instance across the application
- **Connection Monitoring**: Middleware to track query performance and failures

### 2. Environment Configuration
```env
# Optimized connection limits
DATABASE_URL="...&connection_limit=3&pool_timeout=30&connect_timeout=10&pgbouncer=true"
DIRECT_URL="...&connection_limit=2&pool_timeout=30&connect_timeout=10"

# Connection monitoring
DB_CONNECTION_LIMIT=3
DB_POOL_TIMEOUT=30
DB_QUERY_TIMEOUT=15
DB_CONNECTION_MONITORING=true
```

### 3. Connection Monitoring
- **Automatic Health Checks**: Every 30 seconds
- **Connection Metrics**: Track active connections, query performance
- **Alert System**: Warnings for connection issues
- **Recovery Mechanisms**: Automatic connection cleanup and retry

### 4. Improved Error Handling
- **Graceful Degradation**: Fall back to Redis/memory cache when database unavailable
- **Circuit Breaker**: Prevent cascading failures
- **Retry Logic**: Exponential backoff for failed operations

## Monitoring and Debugging

### Health Check Endpoints
```bash
# Basic health check
curl http://localhost:3000/api/db-health

# Health check with monitoring data
curl 'http://localhost:3000/api/db-health?monitoring=true'
```

### NPM Scripts
```bash
# Clean up database connections
npm run db:cleanup

# Check database health
npm run db:health

# Monitor connection status
npm run db:monitor
```

### Connection Monitoring
The application automatically monitors database connections when `DB_CONNECTION_MONITORING=true`:
- Tracks connection usage and performance
- Alerts on connection limit issues
- Provides automatic recovery mechanisms
- Logs detailed connection metrics

## Best Practices

### 1. Connection Management
- **Use Singleton Pattern**: Always use the global `prisma` instance
- **Proper Cleanup**: Use `$disconnect()` in cleanup handlers
- **Avoid Long Transactions**: Keep transactions short and focused
- **Connection Pooling**: Let Prisma handle connection pooling

### 2. Error Handling
- **Graceful Degradation**: Always have fallback mechanisms
- **Connection Limit Detection**: Check for connection limit errors
- **Retry Logic**: Implement exponential backoff for retries
- **Circuit Breaker**: Prevent cascading failures

### 3. Caching Strategy
- **Multi-Tier Caching**: Browser → Redis → Database
- **Cache-First**: Check cache before database
- **Fallback Mechanisms**: Use cache when database unavailable
- **TTL Management**: Appropriate cache expiration times

### 4. Performance Optimization
- **Query Optimization**: Use efficient queries and indexes
- **Batch Operations**: Group multiple operations when possible
- **Connection Reuse**: Minimize connection creation/destruction
- **Monitoring**: Track performance metrics and alerts

## Troubleshooting

### Connection Limit Exceeded
1. **Check Current Connections**:
   ```bash
   npm run db:cleanup
   ```

2. **Monitor Connection Status**:
   ```bash
   npm run db:monitor
   ```

3. **Review Application Logs**:
   - Look for connection error patterns
   - Check for long-running queries
   - Identify connection leaks

4. **Temporary Solutions**:
   - Restart the application
   - Wait for connections to timeout (30 seconds)
   - Use Redis cache to reduce database load

### Redis Pipeline Failures
1. **Check Redis Connectivity**:
   ```bash
   curl http://localhost:3000/api/health/redis
   ```

2. **Clear Redis Cache**:
   ```bash
   curl -X POST http://localhost:3000/api/cache -d '{"action":"clear"}'
   ```

3. **Monitor Redis Health**:
   - Check Redis connection status
   - Review pipeline error logs
   - Verify Redis configuration

### Performance Issues
1. **Query Performance**:
   - Enable query logging in development
   - Identify slow queries (>1000ms)
   - Optimize database indexes

2. **Connection Pool Monitoring**:
   - Track connection usage patterns
   - Monitor pool exhaustion
   - Adjust pool settings if needed

## Configuration Reference

### Environment Variables
- `DB_CONNECTION_LIMIT`: Maximum database connections (default: 3)
- `DB_POOL_TIMEOUT`: Connection pool timeout in seconds (default: 30)
- `DB_QUERY_TIMEOUT`: Individual query timeout in seconds (default: 15)
- `DB_CONNECTION_MONITORING`: Enable connection monitoring (default: false)
- `DISABLE_DATABASE_CACHE`: Disable database caching (default: true)

### Prisma Configuration
- Connection pooling with strict limits
- Automatic connection cleanup
- Query performance monitoring
- Error handling middleware

### Redis Configuration
- Pipeline error handling
- Circuit breaker patterns
- Fallback mechanisms
- Connection retry logic

## Monitoring Dashboard

The application provides comprehensive monitoring through:
- Database health check API
- Connection metrics tracking
- Alert system for issues
- Performance monitoring
- Automatic recovery mechanisms

Access monitoring data via:
- `/api/db-health?monitoring=true`
- Application logs
- Connection metrics
- Alert notifications
