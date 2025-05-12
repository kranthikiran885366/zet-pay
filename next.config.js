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
        hostname: 'api.qrserver.com', 
        port: '',
        pathname: '/**',
      },
       {
        protocol: 'https',
        hostname: 'example.com', 
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on Node.js modules for client-side builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback, 
        fs: false,
        child_process: false,
        os: false,
        net: false, 
        tls: false, 
      };
    }
    return config;
  },
};

module.exports = nextConfig;