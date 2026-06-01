/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://16.171.166.199:8000/api/:path*',
      },
      {
        source: '/tts',
        destination: 'http://16.171.166.199:8000/tts',
      },
      {
        source: '/wfm/:path*',
        destination: 'http://16.171.166.199:8000/wfm/:path*',
      },
    ]
  },
};
export default nextConfig;
