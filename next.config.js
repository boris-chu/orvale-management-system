/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is now stable in Next.js 13+
  reactStrictMode: true,
  
  // Note: allowedDevOrigins is not available in Next.js 15.4.6
  // Cross-origin warnings can be safely ignored in development
  
  // TypeScript configuration
  typescript: {
    // Dangerously allow production builds to successfully complete even if there are type errors
    ignoreBuildErrors: true,
  },
  
  // ESLint configuration
  eslint: {
    // Warning: This allows production builds to successfully complete even if ESLint errors are present
    ignoreDuringBuilds: true,
  },
  
  // Environment variables that should be available on the client side
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // API routes configuration
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  
  // Image optimization
  images: {
    domains: [
      'localhost',
      'media.giphy.com',
      'media0.giphy.com', 
      'media1.giphy.com',
      'media2.giphy.com',
      'media3.giphy.com',
      'media4.giphy.com',
      'i.giphy.com',
      'via.placeholder.com' // For fallback placeholders
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; img-src 'self' data: https://media.giphy.com https://media0.giphy.com https://media1.giphy.com https://media2.giphy.com https://media3.giphy.com https://media4.giphy.com https://i.giphy.com https://via.placeholder.com; connect-src 'self' https://api.giphy.com;",
          },
        ],
      },
    ];
  },
  
  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Custom webpack configuration if needed
    return config;
  },
};

module.exports = nextConfig;