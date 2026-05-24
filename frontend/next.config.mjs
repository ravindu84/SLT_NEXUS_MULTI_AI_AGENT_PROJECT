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
        destination: 'http://13.61.4.78:8000/:path*', // Proxy to AWS Backend
      },
    ];
  },
};

export default nextConfig;
