import { cn } from "@/lib/utils";

// Portadas sin imagen: una "pantalla" de terminal. El brillo del acento cambia de esquina
// según el curso, de forma estable, para que dos portadas seguidas no sean idénticas.
const GLOWS = [
  "bg-[radial-gradient(circle_at_85%_15%,color-mix(in_oklch,var(--term-accent)_22%,transparent),transparent_55%)]",
  "bg-[radial-gradient(circle_at_15%_20%,color-mix(in_oklch,var(--term-key)_20%,transparent),transparent_55%)]",
  "bg-[radial-gradient(circle_at_80%_85%,color-mix(in_oklch,var(--term-num)_18%,transparent),transparent_55%)]",
  "bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--term-ok)_18%,transparent),transparent_60%)]",
];

function hash(value: string) {
  let h = 0;
  for (const ch of value) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function CourseCover({
  title,
  src,
  className,
}: {
  title: string;
  src?: string | null;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- portadas en Spaces/CDN con dominio configurable
      <img src={src} alt="" className={cn("aspect-video w-full object-cover", className)} loading="lazy" />
    );
  }
  return (
    // Oscura en los dos temas, como la pantalla del reproductor.
    <div
      className={cn(
        "dark relative flex aspect-video w-full items-end overflow-hidden bg-term-screen p-4 font-term",
        className,
      )}
      aria-hidden
    >
      <div className={cn("absolute inset-0", GLOWS[hash(title) % GLOWS.length])} />
      <div className="absolute inset-0 bg-[linear-gradient(var(--term-border)_1px,transparent_1px),linear-gradient(90deg,var(--term-border)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_85%)] bg-[size:28px_28px] opacity-50" />
      <span className="relative line-clamp-2 text-lg leading-tight font-extrabold tracking-[-0.01em] text-term-text">
        <span className="text-term-accent">$ </span>
        {title}
      </span>
    </div>
  );
}
