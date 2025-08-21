/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static exports for deployment
  output: 'export',
  
  // Disable server-side rendering for specific pages
  // This ensures API routes work correctly in static export
  images: {
    unoptimized: true,
  },
  
  // Enable CORS for API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  },
  
  // Disable TypeScript type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
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
