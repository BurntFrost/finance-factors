/**
 * Shared API Endpoint Constants
 * 
 * API endpoint configurations used by both frontend and backend
 */

// API proxy endpoints
export const PROXY_API_ENDPOINTS = {
  FRED: {
    BASE_URL: 'https://api.stlouisfed.org/fred',
    SERIES: '/series/observations',
    SERIES_INFO: '/series',
  },
  BLS: {
    BASE_URL: 'https://api.bls.gov/publicAPI/v2',
    SERIES: '/timeseries/data',
  },
  CENSUS: {
    BASE_URL: 'https://api.census.gov/data',
    ACS: '/2022/acs/acs1',
    ECONOMIC: '/timeseries/eits',
  },
  ALPHA_VANTAGE: {
    BASE_URL: 'https://www.alphavantage.co/query',
    TIME_SERIES: '',
    ECONOMIC_INDICATORS: '',
  },
} as const;

// Internal API endpoints
export const INTERNAL_API_ENDPOINTS = {
  PROXY_DATA: '/api/proxy/data',
  HEALTH: '/api/health',
  PROXY_HEALTH: '/api/proxy/health',
  CACHE: '/api/cache',
  RATE_LIMIT: '/api/rate-limit',
  PERFORMANCE: '/api/performance',
  DB_HEALTH: '/api/db-health',
  GRAPHQL: '/api/graphql',
  WEBSOCKET: '/api/ws',
} as const;

// Health check endpoints
export const HEALTH_CHECK_ENDPOINTS = {
  MAIN: '/api/health',
  PROXY: '/api/proxy/health',
  REDIS: '/api/health/redis',
  DATABASE: '/api/db-health',
  DASHBOARD: '/api/health/dashboard',
  DEPLOYMENT: '/api/health/deployment',
  MONITORING: '/api/health/monitoring',
  VERCEL: '/api/health/vercel',
} as const;

// Rate limiting configurations
export const RATE_LIMITS = {
  FRED: {
    requestsPerMinute: 120,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
  },
  BLS: {
    requestsPerMinute: 25,
    requestsPerHour: 500,
    requestsPerDay: 5000,
  },
  CENSUS: {
    requestsPerMinute: 500,
    requestsPerHour: 5000,
    requestsPerDay: 50000,
  },
  ALPHA_VANTAGE: {
    requestsPerMinute: 5,
    requestsPerHour: 25,
    requestsPerDay: 500,
  },
  INTERNAL: {
    requestsPerMinute: 1000,
    requestsPerHour: 10000,
    requestsPerDay: 100000,
  },
} as const;

// Cache configurations
export const CACHE_CONFIG = {
  DEFAULT_TTL: {
    API_RESPONSE: 900, // 15 minutes
    HEALTH_CHECK: 60, // 1 minute
    RATE_LIMIT: 3600, // 1 hour
    USER_SESSION: 86400, // 24 hours
    CHART_DATA: 1800, // 30 minutes
  },
  PREFIXES: {
    API_RESPONSE: 'api:response:',
    RATE_LIMIT: 'rate:limit:',
    HEALTH_CHECK: 'health:check:',
    USER_SESSION: 'user:session:',
    CHART_DATA: 'chart:data:',
  },
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// Request timeouts (in milliseconds)
export const TIMEOUTS = {
  API_REQUEST: 30000, // 30 seconds
  HEALTH_CHECK: 5000, // 5 seconds
  DATABASE: 10000, // 10 seconds
  REDIS: 5000, // 5 seconds
  WEBSOCKET: 60000, // 1 minute
} as const;
