import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-heading text-lg font-bold tracking-tight", className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M4 18 12 5l8 13" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 13.5h8" strokeLinecap="round" />
        </svg>
      </span>
      Academia
    </Link>
  );
}
