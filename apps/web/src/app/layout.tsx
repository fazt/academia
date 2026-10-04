import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// Dirección "Terminal": JetBrains Mono para títulos, comandos y datos; Hanken Grotesk para leer.
const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});
const sans = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Academia · Cursos en video para aprender a tu ritmo",
    template: "%s · Academia",
  },
  description:
    "Cursos en video organizados por capítulos, con certificados, comunidad de preguntas y acceso de por vida.",
  openGraph: { type: "website", locale: "es_ES", siteName: "Academia" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${mono.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
