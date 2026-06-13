/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
      {
        source: '/tts',
        destination: 'http://localhost:8000/tts',
      },
      {
        source: '/wfm/:path*',
        destination: 'http://localhost:8000/wfm/:path*',
      },
      {
        source: '/mocks/:path*',
        destination: 'http://localhost:8000/mocks/:path*',
      },
    ]
  },
};
export default nextConfig;
