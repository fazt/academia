import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  image,
  className,
}: {
  name: string;
  image?: string | null;
  /** Tamaño y tipografía: p. ej. "size-16 text-lg" (las iniciales heredan el tamaño de letra). */
  className?: string;
}) {
  return (
    <Avatar className={cn("size-8 text-xs", className)}>
      {image ? <AvatarImage src={image} alt={name} /> : null}
      <AvatarFallback className="bg-term-accent/15 font-term text-[length:inherit] font-bold text-term-accent">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
