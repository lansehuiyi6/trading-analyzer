/** @type {import('next').NextConfig} */
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable server components external packages
  experimental: {
    serverComponentsExternalPackages: ['axios', 'technicalindicators']
  },
  // Use webpack to bundle server dependencies
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [];
    }
    return config;
  },
  // Ensure all dependencies are bundled in serverless functions
  output: 'standalone'
};

export default nextConfig;
