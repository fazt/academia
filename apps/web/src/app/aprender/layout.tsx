import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aprender",
  robots: { index: false },
};

/** Pantalla completa para estudiar: sin la cabecera ni el pie del sitio. */
export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh flex-col bg-background">{children}</div>;
}
