/** @type {import('next').NextConfig} */
const nextConfig = {
  // distDir: "node_modules/.cache/dental-next",
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false
  },
  eslint: {
    ignoreDuringBuilds: true
  },
};

export default nextConfig;

