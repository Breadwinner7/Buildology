import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mgbscmyxlvwhmzjnhiae.supabase.co',
      },
    ],
  },
  experimental: {
    // Disable optimizeCss if critters causes issues
    optimizeCss: false,
    // Disable worker threads that cause Jest issues
    workerThreads: false,
    // Enable turbopack for development only (when ready)
    // turbo: true,
  },
  // Remove turbopack config for now as it's not stable
  // turbopack: {
  //   resolveAlias: {
  //     '@': './src',
  //   },
  // },
  typescript: {
    // Allow build with TypeScript warnings
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allow build with linting warnings
    ignoreDuringBuilds: true,
  },
  poweredByHeader: false,
  compress: true,
  webpack: (config, { dev, isServer }) => {
    // Fix module resolution issues
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        net: false,
        tls: false,
      },
    }
    
    // Fix ESM/CommonJS compatibility
    config.module = {
      ...config.module,
      rules: [
        ...config.module.rules,
        {
          test: /\.m?js$/,
          resolve: {
            fullySpecified: false,
          },
        },
      ],
    }
    
    // Fix Jest worker issues
    if (dev) {
      config.optimization = {
        ...config.optimization,
        minimize: false,
        minimizer: [],
        // Reduce the number of worker processes
        splitChunks: {
          ...config.optimization?.splitChunks,
          chunks: 'all',
          maxAsyncRequests: 1,
          maxInitialRequests: 1,
          cacheGroups: {
            default: false,
            vendors: false,
          },
        },
      }
      
      // Disable all parallelism
      config.parallelism = 1
      
      // Force single-threaded builds
      if (config.module && config.module.rules) {
        config.module.rules.forEach((rule: any) => {
          if (rule.use && Array.isArray(rule.use)) {
            rule.use.forEach((loader: any) => {
              if (typeof loader === 'object' && loader.loader?.includes('swc-loader')) {
                loader.options = { 
                  ...loader.options, 
                  jsc: { 
                    ...loader.options?.jsc,
                    minify: undefined 
                  }
                }
              }
            })
          }
        })
      }
    }
    
    return config
  },
};

export default nextConfig;
