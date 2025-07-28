/**
 * Database Connection Monitor
 * 
 * Monitors database connection health, tracks connection usage,
 * and provides automatic cleanup and recovery mechanisms.
 */

import { checkDatabaseHealth, forceDisconnectPrisma } from './prisma';

interface ConnectionMetrics {
  activeConnections: number;
  totalQueries: number;
  failedQueries: number;
  avgQueryTime: number;
  lastHealthCheck: Date;
  connectionErrors: number;
  lastError?: string;
}

interface ConnectionAlert {
  type: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  metrics: ConnectionMetrics;
}

class DatabaseConnectionMonitor {
  private metrics: ConnectionMetrics = {
    activeConnections: 0,
    totalQueries: 0,
    failedQueries: 0,
    avgQueryTime: 0,
    lastHealthCheck: new Date(),
    connectionErrors: 0,
  };

  private alerts: ConnectionAlert[] = [];
  private healthCheckInterval?: NodeJS.Timeout;
  private isMonitoring = false;
  private readonly maxAlerts = 100;
  private readonly healthCheckIntervalMs = 30000; // 30 seconds

  /**
   * Start monitoring database connections
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      console.log('Database connection monitoring already active');
      return;
    }

    this.isMonitoring = true;
    console.log('Starting database connection monitoring...');

    // Perform initial health check
    this.performHealthCheck();

    // Set up periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckIntervalMs);

    // Set up process exit handlers
    process.on('SIGINT', () => this.stopMonitoring());
    process.on('SIGTERM', () => this.stopMonitoring());
    process.on('beforeExit', () => this.stopMonitoring());
  }

  /**
   * Stop monitoring and cleanup
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) return;

    console.log('Stopping database connection monitoring...');
    this.isMonitoring = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    // Force disconnect Prisma client
    forceDisconnectPrisma().catch(error => {
      console.error('Error during forced disconnect:', error);
    });
  }

  /**
   * Perform health check and update metrics
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const healthResult = await checkDatabaseHealth();
      this.metrics.lastHealthCheck = new Date();

      if (healthResult.status === 'connection_limit') {
        this.recordConnectionError('Connection limit reached');
        this.addAlert('critical', 'Database connection limit exceeded', this.metrics);
        
        // Attempt recovery
        await this.attemptRecovery();
      } else if (healthResult.status === 'unhealthy') {
        this.recordConnectionError(healthResult.error || 'Unknown database error');
        this.addAlert('error', `Database unhealthy: ${healthResult.error}`, this.metrics);
      } else {
        // Reset error count on successful health check
        if (this.metrics.connectionErrors > 0) {
          console.log('Database connection recovered');
          this.metrics.connectionErrors = 0;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.recordConnectionError(errorMessage);
      this.addAlert('error', `Health check failed: ${errorMessage}`, this.metrics);
    }
  }

  /**
   * Record a connection error
   */
  private recordConnectionError(error: string): void {
    this.metrics.connectionErrors++;
    this.metrics.lastError = error;
    console.error(`Database connection error (${this.metrics.connectionErrors}):`, error);
  }

  /**
   * Add an alert to the alert queue
   */
  private addAlert(type: ConnectionAlert['type'], message: string, metrics: ConnectionMetrics): void {
    const alert: ConnectionAlert = {
      type,
      message,
      timestamp: new Date(),
      metrics: { ...metrics },
    };

    this.alerts.unshift(alert);

    // Keep only the most recent alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.maxAlerts);
    }

    // Log critical alerts immediately
    if (type === 'critical') {
      console.error(`CRITICAL DATABASE ALERT: ${message}`);
    }
  }

  /**
   * Attempt to recover from connection issues
   */
  private async attemptRecovery(): Promise<void> {
    console.log('Attempting database connection recovery...');

    try {
      // Force disconnect all connections
      await forceDisconnectPrisma();
      
      // Wait a moment before reconnecting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test connection
      const healthResult = await checkDatabaseHealth();
      
      if (healthResult.status === 'healthy') {
        console.log('Database connection recovery successful');
        this.addAlert('warning', 'Database connection recovered', this.metrics);
      } else {
        console.error('Database connection recovery failed');
      }
    } catch (error) {
      console.error('Error during connection recovery:', error);
    }
  }

  /**
   * Record query metrics
   */
  public recordQuery(duration: number, success: boolean): void {
    this.metrics.totalQueries++;
    
    if (!success) {
      this.metrics.failedQueries++;
    }

    // Update average query time
    this.metrics.avgQueryTime = (this.metrics.avgQueryTime + duration) / 2;

    // Alert on high failure rate
    const failureRate = this.metrics.failedQueries / this.metrics.totalQueries;
    if (failureRate > 0.1 && this.metrics.totalQueries > 10) {
      this.addAlert('warning', `High query failure rate: ${(failureRate * 100).toFixed(1)}%`, this.metrics);
    }
  }

  /**
   * Get current metrics
   */
  public getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent alerts
   */
  public getAlerts(limit = 10): ConnectionAlert[] {
    return this.alerts.slice(0, limit);
  }

  /**
   * Clear all alerts
   */
  public clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Get connection status summary
   */
  public getStatus(): {
    status: 'healthy' | 'warning' | 'error' | 'critical';
    message: string;
    metrics: ConnectionMetrics;
    recentAlerts: ConnectionAlert[];
  } {
    const recentAlerts = this.getAlerts(5);
    const criticalAlerts = recentAlerts.filter(a => a.type === 'critical');
    const errorAlerts = recentAlerts.filter(a => a.type === 'error');
    
    let status: 'healthy' | 'warning' | 'error' | 'critical' = 'healthy';
    let message = 'Database connections are healthy';

    if (criticalAlerts.length > 0) {
      status = 'critical';
      message = `Critical database issues detected: ${criticalAlerts[0].message}`;
    } else if (errorAlerts.length > 0) {
      status = 'error';
      message = `Database errors detected: ${errorAlerts[0].message}`;
    } else if (this.metrics.connectionErrors > 0) {
      status = 'warning';
      message = `Recent connection errors: ${this.metrics.connectionErrors}`;
    }

    return {
      status,
      message,
      metrics: this.getMetrics(),
      recentAlerts,
    };
  }
}

// Global monitor instance
export const dbConnectionMonitor = new DatabaseConnectionMonitor();

// Auto-start monitoring if enabled
if (process.env.DB_CONNECTION_MONITORING === 'true') {
  dbConnectionMonitor.startMonitoring();
}
