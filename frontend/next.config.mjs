/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://51.21.160.246:8000/api/:path*',
      },
      {
        source: '/tts',
        destination: 'http://51.21.160.246:8000/tts',
      },
      {
        source: '/wfm/:path*',
        destination: 'http://51.21.160.246:8000/wfm/:path*',
      },
      {
        source: '/mocks/:path*',
        destination: 'http://51.21.160.246:8000/mocks/:path*',
      },
    ]
  },
};
export default nextConfig;
