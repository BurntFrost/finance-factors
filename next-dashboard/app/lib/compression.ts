/**
 * Response Compression Utilities
 * 
 * Provides intelligent compression for API responses to improve performance:
 * - Automatic compression based on content type and size
 * - Multiple compression algorithms (gzip, brotli)
 * - Streaming compression for large datasets
 * - Performance monitoring and optimization
 */

import { gzip, brotliCompress } from 'zlib';
import { promisify } from 'util';

// Promisified compression functions
const gzipAsync = promisify(gzip);
const brotliAsync = promisify(brotliCompress);

// Compression configuration
interface CompressionConfig {
  threshold?: number; // Minimum size to compress (bytes)
  level?: number; // Compression level (1-9 for gzip, 1-11 for brotli)
  algorithm?: 'gzip' | 'brotli' | 'auto';
  mimeTypes?: string[]; // MIME types to compress
  excludePatterns?: RegExp[]; // Patterns to exclude from compression
}

// Compression statistics
interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: string;
  compressionTime: number;
}

// Default configuration
const DEFAULT_CONFIG: Required<CompressionConfig> = {
  threshold: 1024, // 1KB
  level: 6, // Balanced compression level
  algorithm: 'auto',
  mimeTypes: [
    'application/json',
    'application/javascript',
    'text/css',
    'text/html',
    'text/plain',
    'text/xml',
    'application/xml',
    'image/svg+xml',
  ],
  excludePatterns: [
    /\.(jpg|jpeg|png|gif|webp|ico)$/i, // Already compressed images
    /\.(zip|gz|br|7z|rar)$/i, // Already compressed archives
  ],
};

/**
 * Compression Manager
 */
export class CompressionManager {
  private config: Required<CompressionConfig>;
  private stats: Map<string, CompressionStats[]> = new Map();

  constructor(config: CompressionConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Compress data with optimal algorithm selection
   */
  async compress(
    data: string | Buffer,
    contentType?: string,
    acceptEncoding?: string
  ): Promise<{
    data: Buffer;
    encoding: string;
    stats: CompressionStats;
  } | null> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    
    // Check if compression should be applied
    if (!this.shouldCompress(buffer, contentType)) {
      return null;
    }

    // Determine best compression algorithm
    const algorithm = this.selectAlgorithm(acceptEncoding);
    if (!algorithm) {
      return null;
    }

    const startTime = Date.now();
    let compressedData: Buffer;
    let encoding: string;

    try {
      switch (algorithm) {
        case 'brotli':
          compressedData = await brotliAsync(buffer, {
            params: {
              [require('zlib').constants.BROTLI_PARAM_QUALITY]: this.config.level,
            },
          });
          encoding = 'br';
          break;
        
        case 'gzip':
        default:
          compressedData = await gzipAsync(buffer, {
            level: this.config.level,
          });
          encoding = 'gzip';
          break;
      }

      const compressionTime = Date.now() - startTime;
      const stats: CompressionStats = {
        originalSize: buffer.length,
        compressedSize: compressedData.length,
        compressionRatio: compressedData.length / buffer.length,
        algorithm,
        compressionTime,
      };

      // Store statistics
      this.recordStats(contentType || 'unknown', stats);

      // Only return compressed data if it's actually smaller
      if (compressedData.length < buffer.length) {
        return {
          data: compressedData,
          encoding,
          stats,
        };
      }

      return null;
    } catch (error) {
      console.error('Compression error:', error);
      return null;
    }
  }

  /**
   * Compress JSON response with optimizations
   */
  async compressJson(
    data: any,
    acceptEncoding?: string
  ): Promise<{
    data: Buffer;
    encoding: string;
    stats: CompressionStats;
  } | null> {
    // Optimize JSON before compression
    const optimizedJson = this.optimizeJson(data);
    const jsonString = JSON.stringify(optimizedJson);
    
    return this.compress(jsonString, 'application/json', acceptEncoding);
  }

  /**
   * Stream compression for large datasets
   */
  createCompressionStream(algorithm: 'gzip' | 'brotli' = 'gzip') {
    const zlib = require('zlib');
    
    switch (algorithm) {
      case 'brotli':
        return zlib.createBrotliCompress({
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: this.config.level,
          },
        });
      
      case 'gzip':
      default:
        return zlib.createGzip({
          level: this.config.level,
        });
    }
  }

  /**
   * Get compression statistics
   */
  getStats(): Record<string, {
    totalRequests: number;
    avgCompressionRatio: number;
    avgCompressionTime: number;
    totalBytesSaved: number;
  }> {
    const result: Record<string, any> = {};

    this.stats.forEach((statsList, contentType) => {
      const totalRequests = statsList.length;
      const avgCompressionRatio = statsList.reduce((sum, stat) => sum + stat.compressionRatio, 0) / totalRequests;
      const avgCompressionTime = statsList.reduce((sum, stat) => sum + stat.compressionTime, 0) / totalRequests;
      const totalBytesSaved = statsList.reduce((sum, stat) => sum + (stat.originalSize - stat.compressedSize), 0);

      result[contentType] = {
        totalRequests,
        avgCompressionRatio,
        avgCompressionTime,
        totalBytesSaved,
      };
    });

    return result;
  }

  /**
   * Clear statistics
   */
  clearStats(): void {
    this.stats.clear();
  }

  private shouldCompress(buffer: Buffer, contentType?: string): boolean {
    // Check size threshold
    if (buffer.length < this.config.threshold) {
      return false;
    }

    // Check content type
    if (contentType && !this.config.mimeTypes.includes(contentType)) {
      return false;
    }

    // Check exclude patterns
    if (contentType) {
      for (const pattern of this.config.excludePatterns) {
        if (pattern.test(contentType)) {
          return false;
        }
      }
    }

    return true;
  }

  private selectAlgorithm(acceptEncoding?: string): 'gzip' | 'brotli' | null {
    if (!acceptEncoding) {
      return this.config.algorithm === 'auto' ? 'gzip' : this.config.algorithm;
    }

    const encodings = acceptEncoding.toLowerCase().split(',').map(e => e.trim());

    if (this.config.algorithm === 'auto') {
      // Prefer brotli if supported (better compression)
      if (encodings.includes('br')) {
        return 'brotli';
      }
      if (encodings.includes('gzip')) {
        return 'gzip';
      }
    } else {
      // Use specified algorithm if supported
      const algorithmMap = { gzip: 'gzip', brotli: 'br' };
      const encoding = algorithmMap[this.config.algorithm];
      if (encodings.includes(encoding)) {
        return this.config.algorithm;
      }
    }

    return null;
  }

  private optimizeJson(data: any): any {
    // Remove null values and empty objects/arrays to reduce size
    if (Array.isArray(data)) {
      return data
        .map(item => this.optimizeJson(item))
        .filter(item => item !== null && item !== undefined);
    }

    if (data && typeof data === 'object') {
      const optimized: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        const optimizedValue = this.optimizeJson(value);
        
        // Skip null, undefined, empty objects, and empty arrays
        if (
          optimizedValue !== null &&
          optimizedValue !== undefined &&
          !(Array.isArray(optimizedValue) && optimizedValue.length === 0) &&
          !(typeof optimizedValue === 'object' && Object.keys(optimizedValue).length === 0)
        ) {
          optimized[key] = optimizedValue;
        }
      }
      
      return optimized;
    }

    return data;
  }

  private recordStats(contentType: string, stats: CompressionStats): void {
    if (!this.stats.has(contentType)) {
      this.stats.set(contentType, []);
    }

    const statsList = this.stats.get(contentType)!;
    statsList.push(stats);

    // Keep only last 1000 entries per content type
    if (statsList.length > 1000) {
      statsList.shift();
    }
  }
}

// Global compression manager instance
export const compressionManager = new CompressionManager();

/**
 * Middleware function for Next.js API routes
 */
export function withCompression(
  handler: (req: any, res: any) => Promise<any>,
  config?: CompressionConfig
) {
  const compressor = new CompressionManager(config);

  return async (req: any, res: any) => {
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;

    // Override json method
    res.json = async function(data: any) {
      const acceptEncoding = req.headers['accept-encoding'];
      const compressed = await compressor.compressJson(data, acceptEncoding);

      if (compressed) {
        res.setHeader('Content-Encoding', compressed.encoding);
        res.setHeader('Content-Length', compressed.data.length);
        res.setHeader('Vary', 'Accept-Encoding');
        
        // Add compression stats header in development
        if (process.env.NODE_ENV === 'development') {
          res.setHeader('X-Compression-Ratio', compressed.stats.compressionRatio.toFixed(2));
          res.setHeader('X-Compression-Time', `${compressed.stats.compressionTime}ms`);
        }

        res.setHeader('Content-Type', 'application/json');
        return res.end(compressed.data);
      }

      return originalJson.call(this, data);
    };

    // Override send method
    res.send = async function(data: any) {
      if (typeof data === 'string' || Buffer.isBuffer(data)) {
        const contentType = res.getHeader('content-type') as string;
        const acceptEncoding = req.headers['accept-encoding'];
        const compressed = await compressor.compress(data, contentType, acceptEncoding);

        if (compressed) {
          res.setHeader('Content-Encoding', compressed.encoding);
          res.setHeader('Content-Length', compressed.data.length);
          res.setHeader('Vary', 'Accept-Encoding');
          
          return res.end(compressed.data);
        }
      }

      return originalSend.call(this, data);
    };

    return handler(req, res);
  };
}

// Export compression utilities
export { DEFAULT_CONFIG as defaultCompressionConfig };
