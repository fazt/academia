import Link from "next/link";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-term-border">
        <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-5 py-4 font-term sm:px-10">
          <Logo />
          <Link href="/cursos" className="text-sm text-term-muted transition-colors hover:text-term-text">
            cursos/
          </Link>
          <ThemeToggle className="ml-auto size-10 rounded-lg text-term-muted hover:bg-term-surface hover:text-term-text" />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}
