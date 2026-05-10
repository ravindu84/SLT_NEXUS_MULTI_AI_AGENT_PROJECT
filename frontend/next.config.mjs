/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Enable transpilation for Three.js ecosystem */
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
};

export default nextConfig;
