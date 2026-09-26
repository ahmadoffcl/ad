/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // Cloudflare Pages: optional local bindings in dev via
  // `wrangler pages dev .vercel/output/static` after `npm run pages:build`.
  // No R2 — media stays in public/.
};

export default nextConfig;
