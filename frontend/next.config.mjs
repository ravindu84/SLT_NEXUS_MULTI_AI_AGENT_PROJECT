/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://slt-nexus-demo.loca.lt/api/:path*',
      },
      {
        source: '/tts',
        destination: 'https://slt-nexus-demo.loca.lt/tts',
      },
      {
        source: '/wfm/:path*',
        destination: 'https://slt-nexus-demo.loca.lt/wfm/:path*',
      },
      {
        source: '/mocks/:path*',
        destination: 'https://slt-nexus-demo.loca.lt/mocks/:path*',
      },
    ]
  },
};
export default nextConfig;
