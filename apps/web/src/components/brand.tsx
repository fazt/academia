import Link from "next/link";
import { cn } from "@/lib/utils";

/** Logotipo de texto con cursor de terminal: "academia▮". */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("flex shrink-0 items-center font-term text-lg font-extrabold text-term-text", className)}
      aria-label={href === "/" ? "Academia, inicio" : "Academia"}
    >
      academia
      <span aria-hidden className="ml-1 inline-block h-5 w-2.5 bg-term-accent" />
    </Link>
  );
}
