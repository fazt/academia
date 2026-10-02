import { cn } from "@/lib/utils";

// Paletas para portadas sin imagen: se elige una por curso de forma estable.
const GRADIENTS = [
  "from-indigo-500 via-violet-500 to-fuchsia-500",
  "from-sky-500 via-cyan-500 to-emerald-400",
  "from-amber-400 via-orange-500 to-rose-500",
  "from-emerald-500 via-teal-500 to-sky-500",
  "from-rose-500 via-pink-500 to-violet-500",
  "from-slate-700 via-slate-600 to-indigo-500",
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
  const gradient = GRADIENTS[hash(title) % GRADIENTS.length];
  return (
    <div
      className={cn(
        "relative flex aspect-video w-full items-end overflow-hidden bg-gradient-to-br p-4",
        gradient,
        className,
      )}
      aria-hidden
    >
      <div className="absolute -top-6 -right-6 size-28 rounded-full bg-white/15" />
      <div className="absolute right-10 bottom-6 size-12 rounded-full bg-white/10" />
      <span className="relative line-clamp-2 font-heading text-lg leading-tight font-bold text-white drop-shadow-sm">
        {title}
      </span>
    </div>
  );
}
