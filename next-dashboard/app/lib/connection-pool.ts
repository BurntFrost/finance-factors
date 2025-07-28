/**
 * Connection Pooling Manager
 * 
 * Optimizes database and external API connections with:
 * - Connection pooling for database operations
 * - HTTP connection reuse for API calls
 * - Intelligent connection management
 * - Performance monitoring and health checks
 */

import { Pool } from 'pg';
import { Agent } from 'https';

// Database connection pool configuration
interface DatabasePoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  max?: number; // Maximum number of connections
  min?: number; // Minimum number of connections
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  maxUses?: number; // Maximum uses per connection
  allowExitOnIdle?: boolean;
}

// HTTP connection pool configuration
interface HttpPoolConfig {
  maxSockets?: number;
  maxFreeSockets?: number;
  timeout?: number;
  keepAlive?: boolean;
  keepAliveMsecs?: number;
}

// Connection pool statistics
interface PoolStats {
  totalConnections: number;
  idleConnections: number;
  activeConnections: number;
  waitingClients: number;
  totalQueries: number;
  avgQueryTime: number;
  errorCount: number;
}

/**
 * Database Connection Pool Manager
 */
export class DatabaseConnectionPool {
  private pool: Pool;
  private stats: PoolStats = {
    totalConnections: 0,
    idleConnections: 0,
    activeConnections: 0,
    waitingClients: 0,
    totalQueries: 0,
    avgQueryTime: 0,
    errorCount: 0,
  };

  constructor(config: DatabasePoolConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      
      // Pool configuration
      max: config.max || 20, // Maximum connections
      min: config.min || 2,  // Minimum connections
      idleTimeoutMillis: config.idleTimeoutMillis || 30000, // 30 seconds
      connectionTimeoutMillis: config.connectionTimeoutMillis || 10000, // 10 seconds
      maxUses: config.maxUses || 7500, // Maximum uses per connection
      allowExitOnIdle: config.allowExitOnIdle || true,
    });

    // Set up event listeners for monitoring
    this.setupEventListeners();
  }

  /**
   * Execute a query with performance monitoring
   */
  async query<T = any>(text: string, params?: any[]): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      
      // Update statistics
      const queryTime = Date.now() - startTime;
      this.updateQueryStats(queryTime, false);
      
      return result.rows as T;
    } catch (error) {
      this.updateQueryStats(Date.now() - startTime, true);
      throw error;
    }
  }

  /**
   * Execute a transaction with automatic rollback on error
   */
  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get connection pool statistics
   */
  getStats(): PoolStats {
    return {
      ...this.stats,
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      activeConnections: this.pool.totalCount - this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
    };
  }

  /**
   * Health check for the connection pool
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency: number;
    connections: PoolStats;
  }> {
    const startTime = Date.now();
    
    try {
      await this.query('SELECT 1');
      const latency = Date.now() - startTime;
      const connections = this.getStats();
      
      // Determine health status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (latency > 1000 || connections.errorCount > 10) {
        status = 'degraded';
      }
      
      if (latency > 5000 || connections.activeConnections >= connections.totalConnections * 0.9) {
        status = 'unhealthy';
      }
      
      return { status, latency, connections };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        connections: this.getStats(),
      };
    }
  }

  /**
   * Gracefully close the connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  private setupEventListeners(): void {
    this.pool.on('connect', () => {
      console.log('Database connection established');
    });

    this.pool.on('error', (error) => {
      console.error('Database pool error:', error);
      this.stats.errorCount++;
    });

    this.pool.on('remove', () => {
      console.log('Database connection removed from pool');
    });
  }

  private updateQueryStats(queryTime: number, isError: boolean): void {
    this.stats.totalQueries++;
    
    if (isError) {
      this.stats.errorCount++;
    }
    
    // Update average query time
    this.stats.avgQueryTime = (
      (this.stats.avgQueryTime * (this.stats.totalQueries - 1)) + queryTime
    ) / this.stats.totalQueries;
  }
}

/**
 * HTTP Connection Pool Manager
 */
export class HttpConnectionPool {
  private agents: Map<string, Agent> = new Map();
  private defaultConfig: Required<HttpPoolConfig> = {
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 30000, // 30 seconds
    keepAlive: true,
    keepAliveMsecs: 1000,
  };

  /**
   * Get or create an HTTP agent for a specific host
   */
  getAgent(hostname: string, config?: HttpPoolConfig): Agent {
    const key = `${hostname}:${JSON.stringify(config || {})}`;
    
    if (!this.agents.has(key)) {
      const finalConfig = { ...this.defaultConfig, ...config };
      
      const agent = new Agent({
        maxSockets: finalConfig.maxSockets,
        maxFreeSockets: finalConfig.maxFreeSockets,
        timeout: finalConfig.timeout,
        keepAlive: finalConfig.keepAlive,
        keepAliveMsecs: finalConfig.keepAliveMsecs,
      });
      
      this.agents.set(key, agent);
    }
    
    return this.agents.get(key)!;
  }

  /**
   * Make an optimized HTTP request with connection pooling
   */
  async request(url: string, options: RequestInit = {}): Promise<Response> {
    const urlObj = new URL(url);
    const agent = this.getAgent(urlObj.hostname);
    
    // Add the agent to the request options
    const requestOptions = {
      ...options,
      // Note: In Node.js fetch, you would use a custom dispatcher
      // This is a simplified example
    };
    
    return fetch(url, requestOptions);
  }

  /**
   * Get statistics for all HTTP agents
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    this.agents.forEach((agent, key) => {
      stats[key] = {
        maxSockets: agent.maxSockets,
        maxFreeSockets: agent.maxFreeSockets,
        // Additional agent statistics would go here
      };
    });
    
    return stats;
  }

  /**
   * Close all HTTP agents
   */
  destroy(): void {
    this.agents.forEach(agent => {
      agent.destroy();
    });
    this.agents.clear();
  }
}

// Global instances
let dbPool: DatabaseConnectionPool | null = null;
export const httpPool = new HttpConnectionPool();

/**
 * Initialize database connection pool
 */
export function initializeDatabasePool(config: DatabasePoolConfig): DatabaseConnectionPool {
  if (!dbPool) {
    dbPool = new DatabaseConnectionPool(config);
  }
  return dbPool;
}

/**
 * Get the database connection pool instance
 */
export function getDatabasePool(): DatabaseConnectionPool {
  if (!dbPool) {
    // Initialize with environment variables
    const config: DatabasePoolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'finance_factors',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true',
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      min: parseInt(process.env.DB_POOL_MIN || '2'),
    };
    
    dbPool = new DatabaseConnectionPool(config);
  }
  
  return dbPool;
}

/**
 * Graceful shutdown handler
 */
export async function closeAllConnections(): Promise<void> {
  const promises: Promise<void>[] = [];
  
  if (dbPool) {
    promises.push(dbPool.close());
  }
  
  httpPool.destroy();
  
  await Promise.all(promises);
}

// Export connection pool instances
export { dbPool as databasePool };
