/**
 * Optimized Data Transformation Pipeline
 * 
 * High-performance data transformation utilities with:
 * - Streaming data processing
 * - Memory-efficient transformations
 * - Parallel processing for large datasets
 * - Caching of transformation results
 * - Performance monitoring
 */

import type { StandardDataPoint, ChartData } from '../types';

// Transformation cache
const transformationCache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface _CachedTransformation {
  data: any;
  timestamp: number;
  hits: number;
}

/**
 * Generate cache key for transformation
 */
function generateCacheKey(
  operation: string,
  data: any,
  options?: any
): string {
  const dataHash = JSON.stringify(data).slice(0, 100); // First 100 chars for performance
  const optionsHash = options ? JSON.stringify(options) : '';
  return `${operation}:${btoa(dataHash + optionsHash)}`;
}

/**
 * Get cached transformation result
 */
function getCachedResult<T>(key: string): T | null {
  const cached = transformationCache.get(key);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    transformationCache.delete(key);
    return null;
  }

  cached.hits++;
  return cached.data as T;
}

/**
 * Cache transformation result
 */
function setCachedResult<T>(key: string, data: T): void {
  transformationCache.set(key, {
    data,
    timestamp: Date.now(),
    hits: 0,
  });

  // Cleanup old entries periodically
  if (transformationCache.size > 1000) {
    const now = Date.now();
    const toDelete: string[] = [];
    
    transformationCache.forEach((cached, key) => {
      if (now - cached.timestamp > CACHE_TTL) {
        toDelete.push(key);
      }
    });
    
    toDelete.forEach(key => transformationCache.delete(key));
  }
}

/**
 * Optimized data point transformation with streaming
 */
export function* transformDataPointsStream(
  dataPoints: StandardDataPoint[],
  transformer: (point: StandardDataPoint, index: number) => any
): Generator<any, void, unknown> {
  for (let i = 0; i < dataPoints.length; i++) {
    yield transformer(dataPoints[i], i);
  }
}

/**
 * Parallel data transformation for large datasets
 */
export async function transformDataPointsParallel<T>(
  dataPoints: StandardDataPoint[],
  transformer: (point: StandardDataPoint, index: number) => T,
  chunkSize: number = 1000
): Promise<T[]> {
  const cacheKey = generateCacheKey('parallel_transform', dataPoints, { chunkSize });
  const cached = getCachedResult<T[]>(cacheKey);
  if (cached) return cached;

  if (dataPoints.length <= chunkSize) {
    // Small dataset, process synchronously
    const result = dataPoints.map(transformer);
    setCachedResult(cacheKey, result);
    return result;
  }

  // Large dataset, process in parallel chunks
  const chunks: StandardDataPoint[][] = [];
  for (let i = 0; i < dataPoints.length; i += chunkSize) {
    chunks.push(dataPoints.slice(i, i + chunkSize));
  }

  const promises = chunks.map(async (chunk, chunkIndex) => {
    return new Promise<T[]>((resolve) => {
      // Use setTimeout to yield control and prevent blocking
      setTimeout(() => {
        const startIndex = chunkIndex * chunkSize;
        const result = chunk.map((point, index) => 
          transformer(point, startIndex + index)
        );
        resolve(result);
      }, 0);
    });
  });

  const results = await Promise.all(promises);
  const flattened = results.flat();
  
  setCachedResult(cacheKey, flattened);
  return flattened;
}

/**
 * Memory-efficient chart data transformation
 */
export function transformToChartDataOptimized(
  dataPoints: StandardDataPoint[],
  label: string = 'Data',
  options?: {
    chartType?: 'line' | 'bar' | 'pie' | 'doughnut';
    colorIndex?: number;
    maxPoints?: number;
    sampling?: 'none' | 'average' | 'max' | 'min';
  }
): ChartData {
  const cacheKey = generateCacheKey('chart_transform', dataPoints, { label, ...options });
  const cached = getCachedResult<ChartData>(cacheKey);
  if (cached) return cached;

  const { maxPoints = 1000, sampling = 'none' } = options || {};
  
  // Apply data sampling if dataset is too large
  let processedPoints = dataPoints;
  if (dataPoints.length > maxPoints && sampling !== 'none') {
    processedPoints = sampleDataPoints(dataPoints, maxPoints, sampling);
  }

  // Use streaming transformation for memory efficiency
  const labels: string[] = [];
  const data: number[] = [];

  for (const point of transformDataPointsStream(processedPoints, (p) => p)) {
    labels.push(point.date);
    data.push(point.value);
  }

  const result: ChartData = {
    labels,
    datasets: [{
      label,
      data,
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      fill: false,
    }],
    isRealData: true,
    lastUpdated: new Date(),
    dataSource: 'Optimized Transform',
  };

  setCachedResult(cacheKey, result);
  return result;
}

/**
 * Sample data points using different strategies
 */
function sampleDataPoints(
  dataPoints: StandardDataPoint[],
  targetCount: number,
  strategy: 'average' | 'max' | 'min'
): StandardDataPoint[] {
  if (dataPoints.length <= targetCount) return dataPoints;

  const bucketSize = Math.ceil(dataPoints.length / targetCount);
  const sampled: StandardDataPoint[] = [];

  for (let i = 0; i < dataPoints.length; i += bucketSize) {
    const bucket = dataPoints.slice(i, i + bucketSize);
    
    let selectedPoint: StandardDataPoint;
    
    switch (strategy) {
      case 'average':
        const avgValue = bucket.reduce((sum, p) => sum + p.value, 0) / bucket.length;
        selectedPoint = {
          date: bucket[Math.floor(bucket.length / 2)].date,
          value: avgValue,
        };
        break;
        
      case 'max':
        selectedPoint = bucket.reduce((max, p) => p.value > max.value ? p : max);
        break;
        
      case 'min':
        selectedPoint = bucket.reduce((min, p) => p.value < min.value ? p : min);
        break;
        
      default:
        selectedPoint = bucket[0];
    }
    
    sampled.push(selectedPoint);
  }

  return sampled;
}

/**
 * Batch transformation for multiple datasets
 */
export async function batchTransformChartData(
  datasets: Array<{
    dataPoints: StandardDataPoint[];
    label: string;
    options?: any;
  }>,
  globalOptions?: {
    maxConcurrency?: number;
    chunkSize?: number;
  }
): Promise<ChartData[]> {
  const { maxConcurrency = 4, chunkSize = 1000 } = globalOptions || {};
  
  // Process datasets in batches to avoid overwhelming the system
  const results: ChartData[] = [];
  
  for (let i = 0; i < datasets.length; i += maxConcurrency) {
    const batch = datasets.slice(i, i + maxConcurrency);
    
    const batchPromises = batch.map(async ({ dataPoints, label, options }) => {
      if (dataPoints.length > chunkSize) {
        // Use parallel processing for large datasets
        const transformedPoints = await transformDataPointsParallel(
          dataPoints,
          (point) => point,
          chunkSize
        );
        return transformToChartDataOptimized(transformedPoints, label, options);
      } else {
        return transformToChartDataOptimized(dataPoints, label, options);
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Get transformation cache statistics
 */
export function getTransformationCacheStats() {
  const stats = {
    size: transformationCache.size,
    totalHits: 0,
    entries: [] as Array<{
      key: string;
      age: number;
      hits: number;
    }>,
  };

  const now = Date.now();
  transformationCache.forEach((cached, key) => {
    stats.totalHits += cached.hits;
    stats.entries.push({
      key: key.slice(0, 50) + '...', // Truncate for readability
      age: now - cached.timestamp,
      hits: cached.hits,
    });
  });

  return stats;
}

/**
 * Clear transformation cache
 */
export function clearTransformationCache() {
  const size = transformationCache.size;
  transformationCache.clear();
  return size;
}
