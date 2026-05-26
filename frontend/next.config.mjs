/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://16.171.166.199:8000/api/:path*',
      },
    ]
  },
};
export default nextConfig;
