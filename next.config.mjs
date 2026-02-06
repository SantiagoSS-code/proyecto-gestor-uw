/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_USE_FIREBASE_EMULATOR: process.env.USE_FIREBASE_EMULATOR,
  },
}

export default nextConfig
