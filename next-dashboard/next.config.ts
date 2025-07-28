import type { NextConfig } from "next";
import path from "path";

// Bundle analyzer configuration
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Environment variables for build time
  env: {
    NEXT_PUBLIC_FRED_API_KEY: process.env.NEXT_PUBLIC_FRED_API_KEY,
    NEXT_PUBLIC_BLS_API_KEY: process.env.NEXT_PUBLIC_BLS_API_KEY,
    NEXT_PUBLIC_CENSUS_API_KEY: process.env.NEXT_PUBLIC_CENSUS_API_KEY,
    NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY: process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY,
    NEXT_PUBLIC_DEFAULT_DATA_SOURCE: process.env.NEXT_PUBLIC_DEFAULT_DATA_SOURCE || 'live-api',
    NEXT_PUBLIC_ENABLE_CACHING: process.env.NEXT_PUBLIC_ENABLE_CACHING || 'true',
    NEXT_PUBLIC_DEBUG_API: process.env.NEXT_PUBLIC_DEBUG_API || 'false',
  },

  // Performance optimizations
  experimental: {
    // Enable optimized package imports for better tree shaking
    optimizePackageImports: ['chart.js', 'react-chartjs-2', 'redis'],
  },

  // Turbopack configuration (for development with --turbopack flag)
  turbopack: {
    rules: {
      // Configure Turbopack rules if needed
    },
  },

  // Webpack optimizations (only for production builds)
  // Note: This will show a warning in development with --turbopack, but it's safe to ignore
  // The webpack config only applies to production builds, not Turbopack development
  webpack: (config, { dev, isServer }) => {
    // Configure path aliases for module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '.'),
      '@/frontend': path.resolve(__dirname, './lib/frontend'),
      '@/backend': path.resolve(__dirname, './lib/backend'),
      '@/shared': path.resolve(__dirname, './lib/shared'),
    };

    // Production optimizations (webpack only, not used in Turbopack development)
    if (!dev && !isServer) {
      // Advanced chunk splitting for better caching and performance
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Framework chunk (React, Next.js)
          framework: {
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            name: 'framework',
            chunks: 'all',
            priority: 40,
            enforce: true,
          },
          // Chart.js and visualization libraries
          charts: {
            test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
            name: 'charts',
            chunks: 'all',
            priority: 35,
            enforce: true,
          },
          // Redis and caching libraries
          redis: {
            test: /[\\/]node_modules[\\/](redis|ioredis)[\\/]/,
            name: 'redis',
            chunks: 'all',
            priority: 30,
            enforce: true,
          },
          // Utilities and smaller libraries
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name: 'lib',
            chunks: 'all',
            priority: 20,
            minChunks: 2,
            reuseExistingChunk: true,
          },
          // Common application code
          common: {
            name: 'common',
            chunks: 'all',
            priority: 10,
            minChunks: 2,
            reuseExistingChunk: true,
          },
        },
      };

      // Enable tree shaking for better bundle optimization
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // Minimize bundle size
      config.optimization.minimize = true;
    }

    return config;
  },

  // Compress output
  compress: true,
};

export default withBundleAnalyzer(nextConfig);
