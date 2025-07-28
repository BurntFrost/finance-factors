/**
 * Smart Cache Optimizer
 * 
 * ML-inspired caching strategy that optimizes TTL values based on
 * data access patterns, volatility, and user behavior.
 */

interface CacheMetrics {
  key: string;
  accessCount: number;
  lastAccessed: Date;
  hitRate: number;
  averageAccessInterval: number;
  dataVolatility: number; // How often data changes
  userPatterns: AccessPattern[];
}

interface AccessPattern {
  timeOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
  accessFrequency: number;
  userType: 'frequent' | 'occasional' | 'new';
}

interface OptimizedCacheConfig {
  key: string;
  optimizedTTL: number;
  confidence: number;
  reasoning: string;
  nextReviewTime: Date;
}

class SmartCacheOptimizer {
  private cacheMetrics = new Map<string, CacheMetrics>();
  private readonly LEARNING_WINDOW_DAYS = 7;
  private readonly MIN_SAMPLES_FOR_OPTIMIZATION = 10;

  /**
   * Get optimized TTL for a cache key based on learned patterns
   */
  public getOptimizedTTL(
    key: string,
    defaultTTL: number,
    dataType: 'api_response' | 'chart_data' | 'user_session' | 'health_check'
  ): OptimizedCacheConfig {
    const metrics = this.cacheMetrics.get(key);
    
    if (!metrics || metrics.accessCount < this.MIN_SAMPLES_FOR_OPTIMIZATION) {
      return {
        key,
        optimizedTTL: defaultTTL,
        confidence: 0.1,
        reasoning: 'Insufficient data for optimization',
        nextReviewTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };
    }

    const optimizedTTL = this.calculateOptimalTTL(metrics, defaultTTL, dataType);
    const confidence = this.calculateConfidence(metrics);
    const reasoning = this.generateReasoning(metrics, optimizedTTL, defaultTTL);

    return {
      key,
      optimizedTTL,
      confidence,
      reasoning,
      nextReviewTime: new Date(Date.now() + this.getReviewInterval(confidence)),
    };
  }

  /**
   * Record cache access for learning
   */
  public recordCacheAccess(
    key: string,
    hit: boolean,
    userType: AccessPattern['userType'] = 'occasional'
  ): void {
    const now = new Date();
    const metrics = this.cacheMetrics.get(key) || this.createInitialMetrics(key);

    // Update access metrics
    metrics.accessCount++;
    metrics.lastAccessed = now;
    
    // Update hit rate
    const totalHits = metrics.hitRate * (metrics.accessCount - 1) + (hit ? 1 : 0);
    metrics.hitRate = totalHits / metrics.accessCount;

    // Update access patterns
    this.updateAccessPatterns(metrics, now, userType);
    
    // Calculate access interval
    this.updateAccessInterval(metrics, now);

    this.cacheMetrics.set(key, metrics);
  }

  /**
   * Calculate optimal TTL based on access patterns and data volatility
   */
  private calculateOptimalTTL(
    metrics: CacheMetrics,
    defaultTTL: number,
    dataType: string
  ): number {
    // Base TTL on access frequency
    const accessFrequencyMultiplier = Math.min(2, Math.max(0.5, 
      metrics.averageAccessInterval / (5 * 60 * 1000) // 5 minutes baseline
    ));

    // Adjust for hit rate (higher hit rate = longer TTL)
    const hitRateMultiplier = Math.min(2, Math.max(0.3, metrics.hitRate * 1.5));

    // Adjust for data volatility (higher volatility = shorter TTL)
    const volatilityMultiplier = Math.min(2, Math.max(0.2, 1 - metrics.dataVolatility));

    // Data type specific adjustments
    const dataTypeMultiplier = this.getDataTypeMultiplier(dataType);

    // Calculate optimized TTL
    const optimizedTTL = defaultTTL *
      accessFrequencyMultiplier * 
      hitRateMultiplier * 
      volatilityMultiplier * 
      dataTypeMultiplier;

    // Apply reasonable bounds
    const minTTL = dataType === 'health_check' ? 30000 : 60000; // 30s or 1min
    const maxTTL = dataType === 'user_session' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000; // 24h or 1h

    return Math.max(minTTL, Math.min(maxTTL, optimizedTTL));
  }

  /**
   * Update access patterns for time-based optimization
   */
  private updateAccessPatterns(
    metrics: CacheMetrics,
    accessTime: Date,
    userType: AccessPattern['userType']
  ): void {
    const hour = accessTime.getHours();
    const dayOfWeek = accessTime.getDay();

    // Find or create pattern for this time slot
    let pattern = metrics.userPatterns.find(p => 
      p.timeOfDay === hour && p.dayOfWeek === dayOfWeek && p.userType === userType
    );

    if (!pattern) {
      pattern = {
        timeOfDay: hour,
        dayOfWeek,
        accessFrequency: 0,
        userType,
      };
      metrics.userPatterns.push(pattern);
    }

    pattern.accessFrequency++;

    // Keep only recent patterns (last 30 days worth)
    if (metrics.userPatterns.length > 30 * 24) {
      metrics.userPatterns.sort((a, b) => b.accessFrequency - a.accessFrequency);
      metrics.userPatterns = metrics.userPatterns.slice(0, 30 * 24);
    }
  }

  private getDataTypeMultiplier(dataType: string): number {
    switch (dataType) {
      case 'api_response': return 1.0;
      case 'chart_data': return 0.8; // Chart data changes more frequently
      case 'user_session': return 2.0; // User sessions can be cached longer
      case 'health_check': return 0.3; // Health checks need frequent updates
      default: return 1.0;
    }
  }

  private calculateConfidence(metrics: CacheMetrics): number {
    // Confidence based on sample size and consistency
    const sampleSizeConfidence = Math.min(1, metrics.accessCount / 100);
    const hitRateConsistency = 1 - Math.abs(0.7 - metrics.hitRate); // Optimal hit rate around 70%
    const patternConsistency = metrics.userPatterns.length > 5 ? 0.8 : 0.4;

    return (sampleSizeConfidence + hitRateConsistency + patternConsistency) / 3;
  }

  /**
   * Generate human-readable reasoning for TTL optimization
   */
  private generateReasoning(metrics: CacheMetrics, optimizedTTL: number, defaultTTL: number): string {
    const change = optimizedTTL - defaultTTL;
    const changePercent = Math.round((change / defaultTTL) * 100);

    if (Math.abs(changePercent) < 10) {
      return `TTL maintained near default (${changePercent > 0 ? '+' : ''}${changePercent}%) - stable access patterns`;
    }

    if (change > 0) {
      const reasons = [];
      if (metrics.hitRate > 0.7) reasons.push('high hit rate');
      if (metrics.averageAccessInterval > 10 * 60 * 1000) reasons.push('infrequent access');
      if (metrics.dataVolatility < 0.3) reasons.push('stable data');

      return `TTL increased by ${changePercent}% due to: ${reasons.join(', ')}`;
    } else {
      const reasons = [];
      if (metrics.hitRate < 0.5) reasons.push('low hit rate');
      if (metrics.averageAccessInterval < 2 * 60 * 1000) reasons.push('frequent access');
      if (metrics.dataVolatility > 0.7) reasons.push('volatile data');

      return `TTL decreased by ${Math.abs(changePercent)}% due to: ${reasons.join(', ')}`;
    }
  }

  /**
   * Get review interval based on confidence level
   */
  private getReviewInterval(confidence: number): number {
    // Higher confidence = longer review intervals
    const baseInterval = 24 * 60 * 60 * 1000; // 24 hours
    const multiplier = Math.max(0.5, Math.min(7, confidence * 7)); // 0.5 to 7 days
    return baseInterval * multiplier;
  }

  /**
   * Create initial metrics for a new cache key
   */
  private createInitialMetrics(key: string): CacheMetrics {
    return {
      key,
      accessCount: 0,
      lastAccessed: new Date(),
      hitRate: 0,
      averageAccessInterval: 0,
      dataVolatility: 0.5, // Default moderate volatility
      userPatterns: [],
    };
  }

  /**
   * Update average access interval
   */
  private updateAccessInterval(metrics: CacheMetrics, currentTime: Date): void {
    if (metrics.accessCount <= 1) {
      metrics.averageAccessInterval = 0;
      return;
    }

    const timeSinceLastAccess = currentTime.getTime() - metrics.lastAccessed.getTime();

    // Exponential moving average for access interval
    const alpha = 0.1; // Smoothing factor
    if (metrics.averageAccessInterval === 0) {
      metrics.averageAccessInterval = timeSinceLastAccess;
    } else {
      metrics.averageAccessInterval =
        alpha * timeSinceLastAccess + (1 - alpha) * metrics.averageAccessInterval;
    }
  }
}

export const smartCacheOptimizer = new SmartCacheOptimizer();