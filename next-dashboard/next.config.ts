import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for GitHub Pages
  output: 'export',

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Configure asset prefix for GitHub Pages (will be set via environment variable)
  assetPrefix: process.env.NODE_ENV === 'production' ? '/finance-factors' : '',
  basePath: process.env.NODE_ENV === 'production' ? '/finance-factors' : '',

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
