import type { NextConfig } from "next";

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

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Enable bundle analyzer when ANALYZE=true
    if (process.env.ANALYZE === 'true') {
      const withBundleAnalyzer = require('@next/bundle-analyzer')({
        enabled: true,
      });
      return withBundleAnalyzer(config);
    }

    // Production optimizations
    if (!dev && !isServer) {
      // Split chunks for better caching
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          // Separate chunk for Chart.js
          chartjs: {
            test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
            name: 'chartjs',
            chunks: 'all',
            priority: 30,
          },
          // Separate chunk for React
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 20,
          },
        },
      };
    }

    return config;
  },

  // Compress output
  compress: true,
};

export default nextConfig;
