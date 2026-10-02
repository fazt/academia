"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="font-heading text-2xl font-bold">Algo salió mal</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        No pudimos cargar esta página. Comprueba tu conexión e inténtalo de nuevo.
      </p>
      <Button className="mt-6" onClick={reset}>
        <RefreshCw /> Reintentar
      </Button>
    </div>
  );
}
