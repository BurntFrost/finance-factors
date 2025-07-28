/**
 * Request Batching System
 * 
 * Optimizes API performance by:
 * - Batching multiple requests into single calls
 * - Deduplicating identical requests
 * - Implementing request queuing and throttling
 * - Providing intelligent retry logic
 * - Monitoring performance metrics
 */

import { cache } from './advanced-cache';

// Request configuration
interface BatchRequestConfig {
  maxBatchSize?: number;
  batchTimeout?: number; // ms to wait before sending batch
  retryAttempts?: number;
  retryDelay?: number; // ms
  priority?: 'low' | 'normal' | 'high';
  deduplicate?: boolean;
}

// Request item
interface BatchRequestItem<T = any> {
  id: string;
  endpoint: string;
  params: Record<string, any>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority: 'low' | 'normal' | 'high';
  retryCount: number;
}

// Batch response
interface BatchResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  requestId: string;
  responseTime: number;
}

/**
 * Request Batcher for optimizing API calls
 */
export class RequestBatcher {
  private queues: Map<string, BatchRequestItem[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private inFlight: Set<string> = new Set();
  private metrics = {
    totalRequests: 0,
    batchedRequests: 0,
    deduplicatedRequests: 0,
    avgBatchSize: 0,
    avgResponseTime: 0,
  };

  private defaultConfig: Required<BatchRequestConfig> = {
    maxBatchSize: 10,
    batchTimeout: 100, // 100ms
    retryAttempts: 3,
    retryDelay: 1000,
    priority: 'normal',
    deduplicate: true,
  };

  /**
   * Add request to batch queue
   */
  async request<T>(
    endpoint: string,
    params: Record<string, any> = {},
    config: BatchRequestConfig = {}
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const requestId = this.generateRequestId(endpoint, params);
    
    // Check for duplicate requests if deduplication is enabled
    if (finalConfig.deduplicate) {
      const existingRequest = this.findExistingRequest(endpoint, params);
      if (existingRequest) {
        this.metrics.deduplicatedRequests++;
        return new Promise((resolve, reject) => {
          existingRequest.resolve = resolve;
          existingRequest.reject = reject;
        });
      }
    }

    // Check cache first
    const cacheKey = `batch:${requestId}`;
    const cached = await cache.get<T>(cacheKey);
    if (cached) {
      return cached;
    }

    return new Promise<T>((resolve, reject) => {
      const requestItem: BatchRequestItem<T> = {
        id: requestId,
        endpoint,
        params,
        resolve,
        reject,
        timestamp: Date.now(),
        priority: finalConfig.priority,
        retryCount: 0,
      };

      this.addToQueue(endpoint, requestItem, finalConfig);
      this.metrics.totalRequests++;
    });
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Clear all queues and reset metrics
   */
  clear() {
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    
    // Reject all pending requests
    this.queues.forEach(queue => {
      queue.forEach(item => {
        item.reject(new Error('Request cancelled'));
      });
    });
    
    this.queues.clear();
    this.inFlight.clear();
    
    // Reset metrics
    this.metrics = {
      totalRequests: 0,
      batchedRequests: 0,
      deduplicatedRequests: 0,
      avgBatchSize: 0,
      avgResponseTime: 0,
    };
  }

  private addToQueue(
    endpoint: string,
    requestItem: BatchRequestItem,
    config: Required<BatchRequestConfig>
  ) {
    if (!this.queues.has(endpoint)) {
      this.queues.set(endpoint, []);
    }

    const queue = this.queues.get(endpoint)!;
    
    // Insert based on priority
    const insertIndex = this.findInsertIndex(queue, requestItem.priority);
    queue.splice(insertIndex, 0, requestItem);

    // Check if we should process the batch immediately
    if (queue.length >= config.maxBatchSize) {
      this.processBatch(endpoint, config);
    } else {
      // Set or reset timer
      this.setTimer(endpoint, config);
    }
  }

  private setTimer(endpoint: string, config: Required<BatchRequestConfig>) {
    // Clear existing timer
    const existingTimer = this.timers.get(endpoint);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.processBatch(endpoint, config);
    }, config.batchTimeout);

    this.timers.set(endpoint, timer);
  }

  private async processBatch(endpoint: string, config: Required<BatchRequestConfig>) {
    const queue = this.queues.get(endpoint);
    if (!queue || queue.length === 0) return;

    // Clear timer
    const timer = this.timers.get(endpoint);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(endpoint);
    }

    // Extract batch
    const batch = queue.splice(0, config.maxBatchSize);
    const batchId = `${endpoint}:${Date.now()}`;

    // Check if already in flight
    if (this.inFlight.has(batchId)) return;
    this.inFlight.add(batchId);

    try {
      const startTime = Date.now();
      const responses = await this.executeBatch(endpoint, batch);
      const responseTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(batch.length, responseTime);

      // Process responses
      responses.forEach((response, index) => {
        const requestItem = batch[index];
        
        if (response.success && response.data !== undefined) {
          // Cache successful responses
          const cacheKey = `batch:${requestItem.id}`;
          cache.set(cacheKey, response.data, {
            ttl: 300, // 5 minutes
            tags: [endpoint],
          });
          
          requestItem.resolve(response.data);
        } else {
          const error = new Error(response.error || 'Batch request failed');
          
          // Retry logic
          if (requestItem.retryCount < config.retryAttempts) {
            requestItem.retryCount++;
            setTimeout(() => {
              this.addToQueue(endpoint, requestItem, config);
            }, config.retryDelay * Math.pow(2, requestItem.retryCount - 1));
          } else {
            requestItem.reject(error);
          }
        }
      });
    } catch (error) {
      // Handle batch failure
      batch.forEach(requestItem => {
        if (requestItem.retryCount < config.retryAttempts) {
          requestItem.retryCount++;
          setTimeout(() => {
            this.addToQueue(endpoint, requestItem, config);
          }, config.retryDelay * Math.pow(2, requestItem.retryCount - 1));
        } else {
          requestItem.reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    } finally {
      this.inFlight.delete(batchId);
      
      // Process remaining items in queue
      if (queue.length > 0) {
        this.setTimer(endpoint, config);
      }
    }
  }

  private async executeBatch(
    endpoint: string,
    batch: BatchRequestItem[]
  ): Promise<BatchResponse[]> {
    // This would be implemented based on your specific API structure
    // For now, we'll simulate individual requests
    const promises = batch.map(async (item): Promise<BatchResponse> => {
      try {
        const startTime = Date.now();
        
        // Make actual API call (this would be replaced with your API logic)
        const response = await this.makeApiCall(endpoint, item.params);
        
        return {
          success: true,
          data: response,
          requestId: item.id,
          responseTime: Date.now() - startTime,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          requestId: item.id,
          responseTime: 0,
        };
      }
    });

    return Promise.all(promises);
  }

  private async makeApiCall(endpoint: string, params: Record<string, any>): Promise<any> {
    // This would be replaced with your actual API call logic
    // For example, calling your existing proxy services
    const response = await fetch(`/api/proxy/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return response.json();
  }

  private generateRequestId(endpoint: string, params: Record<string, any>): string {
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    return `${endpoint}:${btoa(paramString)}`;
  }

  private findExistingRequest(
    endpoint: string,
    params: Record<string, any>
  ): BatchRequestItem | null {
    const queue = this.queues.get(endpoint);
    if (!queue) return null;

    const requestId = this.generateRequestId(endpoint, params);
    return queue.find(item => item.id === requestId) || null;
  }

  private findInsertIndex(queue: BatchRequestItem[], priority: 'low' | 'normal' | 'high'): number {
    const priorityOrder = { high: 3, normal: 2, low: 1 };
    const targetPriority = priorityOrder[priority];

    for (let i = 0; i < queue.length; i++) {
      if (priorityOrder[queue[i].priority] < targetPriority) {
        return i;
      }
    }

    return queue.length;
  }

  private updateMetrics(batchSize: number, responseTime: number) {
    this.metrics.batchedRequests += batchSize;
    
    // Update average batch size
    const totalBatches = this.metrics.batchedRequests / this.metrics.avgBatchSize || 1;
    this.metrics.avgBatchSize = (this.metrics.avgBatchSize * (totalBatches - 1) + batchSize) / totalBatches;
    
    // Update average response time
    this.metrics.avgResponseTime = (this.metrics.avgResponseTime + responseTime) / 2;
  }
}

// Global request batcher instance
export const requestBatcher = new RequestBatcher();

// Convenience function for making batched requests
export const batchRequest = <T>(
  endpoint: string,
  params?: Record<string, any>,
  config?: BatchRequestConfig
): Promise<T> => requestBatcher.request<T>(endpoint, params, config);
