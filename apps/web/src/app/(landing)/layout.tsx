import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";

const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});
const sans = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"] });

/**
 * La portada usa la dirección visual "Terminal": siempre oscura (clase `dark`
 * para que los componentes de shadcn que contiene usen sus tokens oscuros).
 */
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`dark ${mono.variable} ${sans.variable} flex min-h-svh flex-1 flex-col bg-term-bg font-term-sans text-term-text [color-scheme:dark]`}
    >
      <LandingHeader />
      <main className="flex-1">{children}</main>
      <LandingFooter />
    </div>
  );
}
