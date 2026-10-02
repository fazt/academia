import type { NextConfig } from "next";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://localhost:3011";

const nextConfig: NextConfig = {
  transpilePackages: ["@academia/shared"],
  // En desarrollo la web proxyea /api a Hono: misma cookie de sesión y sin CORS.
  // En producción conviene enrutar /api con el proxy de delante (Caddy, Cloudflare...),
  // que reenvía la IP real y no tiene el límite de tiempo del proxy de Next.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_INTERNAL_URL}/api/:path*` }];
  },
};

export default nextConfig;
