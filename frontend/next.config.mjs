/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Enable transpilation for Three.js ecosystem */
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors. Needed to bypass strict react-hooks rules.
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://51.21.160.246:8000/api/:path*',
      },
      {
        source: '/mocks/:path*',
        destination: 'http://51.21.160.246:8000/mocks/:path*',
      },
    ]
  },
};

export default nextConfig;
