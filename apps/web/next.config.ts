import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@monokeros/types',
    '@monokeros/ui',
    '@monokeros/constants',
    '@monokeros/utils',
    '@monokeros/mock-data',
    '@monokeros/avatar',
  ],
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react', '@xyflow/react'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  productionBrowserSourceMaps: false,
  compress: true,
  async headers() {
    return [
      {
        source: '/icons/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
