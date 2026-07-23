/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep native modules out of the Turbopack/webpack bundle.
  serverExternalPackages: ["ably", "sharp"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
