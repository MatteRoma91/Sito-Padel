/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/avatars/:path*', destination: '/api/serve-avatar/:path*' },
    ];
  },
};

export default nextConfig;
