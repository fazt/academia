"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { CourseCover } from "@/components/course/course-cover";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api, call, errorMessage } from "@/lib/api";
import { uploadToSpaces } from "@/lib/upload";

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

/** Portada del curso: sube la imagen a Spaces con un POST prefirmado y devuelve su URL pública. */
export function CoverUpload({
  title,
  value,
  onChange,
}: {
  title: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const handleFile = async (file: File) => {
    if (!ACCEPT.includes(file.type)) {
      toast.error("Usa una imagen JPG, PNG o WebP");
      return;
    }
    setProgress(0);
    try {
      const presign = await call(
        api.admin.uploads.presign.$post({
          json: { kind: "cover", filename: file.name, contentType: file.type, sizeBytes: file.size },
        }),
      );
      await uploadToSpaces(presign, file, setProgress);
      if (!presign.publicUrl) throw new Error("El almacenamiento no devolvió una URL pública");
      onChange(presign.publicUrl);
      toast.success("Portada subida");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm overflow-hidden rounded-lg border">
        <CourseCover title={title || "Nuevo curso"} src={value} />
        {progress !== null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 p-6 backdrop-blur-sm">
            <p className="text-sm font-medium">Subiendo… {progress} %</p>
            <Progress value={progress} className="w-full" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(",")}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={progress !== null} onClick={() => inputRef.current?.click()}>
          <ImageUp /> {value ? "Cambiar portada" : "Subir portada"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" disabled={progress !== null} onClick={() => onChange(null)}>
            <Trash2 /> Quitar
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">JPG, PNG o WebP de hasta 5 MB. Recomendado 1280 × 720 (16:9).</p>
    </div>
  );
}
