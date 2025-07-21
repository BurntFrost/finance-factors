import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for GitHub Pages
  output: 'export',

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Configure asset prefix for GitHub Pages (dynamically set based on repository)
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',

  // Environment variables for build time
  env: {
    NEXT_PUBLIC_FRED_API_KEY: process.env.NEXT_PUBLIC_FRED_API_KEY,
    NEXT_PUBLIC_BLS_API_KEY: process.env.NEXT_PUBLIC_BLS_API_KEY,
    NEXT_PUBLIC_CENSUS_API_KEY: process.env.NEXT_PUBLIC_CENSUS_API_KEY,
    NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY: process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY,
    NEXT_PUBLIC_DEFAULT_DATA_SOURCE: process.env.NEXT_PUBLIC_DEFAULT_DATA_SOURCE || 'historical',
    NEXT_PUBLIC_ENABLE_CACHING: process.env.NEXT_PUBLIC_ENABLE_CACHING || 'true',
    NEXT_PUBLIC_DEBUG_API: process.env.NEXT_PUBLIC_DEBUG_API || 'false',
  },

  // Performance optimizations
  // experimental: {
  //   optimizeCss: true, // Disabled due to critters dependency issue
  // },

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

  // Generate static pages at build time
  trailingSlash: true,
};

export default nextConfig;
