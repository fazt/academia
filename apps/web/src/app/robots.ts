import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/aprender", "/mis-cursos", "/mis-compras", "/mis-certificados", "/perfil", "/carrito", "/checkout"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
