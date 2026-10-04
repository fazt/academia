"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          toast.success("Enlace copiado");
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("No se pudo copiar el enlace");
        }
      }}
    >
      {copied ? <Check /> : <Link2 />} copiar enlace
    </Button>
  );
}
