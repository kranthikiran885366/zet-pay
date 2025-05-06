/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
   eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
   images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com', // Add this entry
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Add webpack configuration
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback, // Spread existing fallbacks
        fs: false, // Prevent bundling 'fs' module on client
        child_process: false, // Prevent bundling 'child_process' module on client
        os: false, // Prevent bundling 'os' module on client
        net: false, // Often needed with 'tls'
        tls: false, // Often needed with https modules
      };
    }

    return config;
  },
};

module.exports = nextConfig;
