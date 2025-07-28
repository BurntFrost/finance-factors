/**
 * Request Deduplication System
 * 
 * Prevents duplicate API requests by:
 * - Tracking in-flight requests
 * - Sharing responses between identical requests
 * - Implementing intelligent cache warming
 * - Providing request fingerprinting
 */

interface PendingRequest<T = any> {
  promise: Promise<T>;
  timestamp: number;
  subscribers: Array<{
    resolve: (value: T) => void;
    reject: (error: Error) => void;
  }>;
}

export class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest>();
  private metrics = {
    totalRequests: 0,
    deduplicatedRequests: 0,
    cacheHits: 0,
    avgResponseTime: 0,
  };

  /**
   * Generate a unique fingerprint for a request
   */
  private generateFingerprint(
    url: string, 
    method: string = 'GET', 
    body?: any,
    headers?: Record<string, string>
  ): string {
    const normalizedHeaders = headers ? 
      Object.keys(headers)
        .sort()
        .reduce((acc, key) => {
          acc[key.toLowerCase()] = headers[key];
          return acc;
        }, {} as Record<string, string>) : {};

    const fingerprint = {
      url: url.toLowerCase(),
      method: method.toUpperCase(),
      body: body ? JSON.stringify(body) : null,
      headers: normalizedHeaders,
    };

    return btoa(JSON.stringify(fingerprint));
  }

  /**
   * Execute a request with deduplication
   */
  async request<T>(
    url: string,
    options: {
      method?: string;
      body?: any;
      headers?: Record<string, string>;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, headers, timeout = 30000 } = options;
    const fingerprint = this.generateFingerprint(url, method, body, headers);
    
    this.metrics.totalRequests++;

    // Check if request is already in flight
    const existingRequest = this.pendingRequests.get(fingerprint);
    if (existingRequest) {
      this.metrics.deduplicatedRequests++;
      
      // Return a promise that resolves when the existing request completes
      return new Promise<T>((resolve, reject) => {
        existingRequest.subscribers.push({ resolve, reject });
      });
    }

    // Create new request
    const startTime = Date.now();
    const requestPromise = this.executeRequest<T>(url, options, timeout);
    
    const pendingRequest: PendingRequest<T> = {
      promise: requestPromise,
      timestamp: startTime,
      subscribers: [],
    };

    this.pendingRequests.set(fingerprint, pendingRequest);

    try {
      const result = await requestPromise;
      const responseTime = Date.now() - startTime;
      
      // Update metrics
      this.updateMetrics(responseTime);
      
      // Resolve all subscribers
      pendingRequest.subscribers.forEach(({ resolve }) => resolve(result));
      
      return result;
    } catch (error) {
      // Reject all subscribers
      const errorObj = error instanceof Error ? error : new Error(String(error));
      pendingRequest.subscribers.forEach(({ reject }) => reject(errorObj));
      
      throw error;
    } finally {
      // Clean up
      this.pendingRequests.delete(fingerprint);
    }
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeRequest<T>(
    url: string,
    options: {
      method?: string;
      body?: any;
      headers?: Record<string, string>;
    },
    timeout: number
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(responseTime: number) {
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime + responseTime) / 2;
  }

  /**
   * Get deduplication metrics
   */
  getMetrics() {
    const deduplicationRate = this.metrics.totalRequests > 0 
      ? (this.metrics.deduplicatedRequests / this.metrics.totalRequests) * 100 
      : 0;

    return {
      ...this.metrics,
      deduplicationRate,
      pendingRequests: this.pendingRequests.size,
    };
  }

  /**
   * Clear all pending requests (useful for cleanup)
   */
  clear() {
    // Reject all pending requests
    this.pendingRequests.forEach(request => {
      const error = new Error('Request deduplicator cleared');
      request.subscribers.forEach(({ reject }) => reject(error));
    });
    
    this.pendingRequests.clear();
  }

  /**
   * Get information about pending requests
   */
  getPendingRequests() {
    const requests: Array<{
      fingerprint: string;
      timestamp: number;
      age: number;
      subscribers: number;
    }> = [];

    const now = Date.now();
    this.pendingRequests.forEach((request, fingerprint) => {
      requests.push({
        fingerprint,
        timestamp: request.timestamp,
        age: now - request.timestamp,
        subscribers: request.subscribers.length,
      });
    });

    return requests;
  }

  /**
   * Clean up old pending requests (in case of memory leaks)
   */
  cleanup(maxAge: number = 60000) { // 1 minute default
    const now = Date.now();
    const toDelete: string[] = [];

    this.pendingRequests.forEach((request, fingerprint) => {
      if (now - request.timestamp > maxAge) {
        // Reject subscribers with timeout error
        const error = new Error('Request timeout during cleanup');
        request.subscribers.forEach(({ reject }) => reject(error));
        toDelete.push(fingerprint);
      }
    });

    toDelete.forEach(fingerprint => {
      this.pendingRequests.delete(fingerprint);
    });

    return toDelete.length;
  }
}

// Global instance
export const requestDeduplicator = new RequestDeduplicator();

// Convenience function
export const deduplicatedFetch = <T>(
  url: string,
  options?: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    timeout?: number;
  }
): Promise<T> => requestDeduplicator.request<T>(url, options);

// Cleanup interval (runs every 5 minutes)
if (typeof window === 'undefined') { // Server-side only
  setInterval(() => {
    const cleaned = requestDeduplicator.cleanup();
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} stale requests`);
    }
  }, 5 * 60 * 1000);
}
