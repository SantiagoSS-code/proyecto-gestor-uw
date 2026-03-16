/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/clubs",
        destination: "/centros",
        permanent: true,
      },
      {
        source: "/clubs/:slug*",
        destination: "/centros/:slug*",
        permanent: true,
      },
    ]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_USE_FIREBASE_EMULATOR: process.env.USE_FIREBASE_EMULATOR,
  },
  skipTrailingSlashRedirect: true,
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  }
}

export default nextConfig
