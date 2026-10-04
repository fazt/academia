"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Camera, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ProfileSection } from "@/components/profile/profile-section";
import { api, call, errorMessage } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { uploadToSpaces } from "@/lib/upload";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

export function AvatarUploader({ name, image }: { name: string; image: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { refetch } = useSession();
  const [progress, setProgress] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);
  const busy = progress !== null || removing;

  const saveImage = async (url: string | null) => {
    const profile = await call(api.me.avatar.$put({ json: { image: url } }));
    queryClient.setQueryData(["me"], profile);
    await refetch();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Usa una imagen JPG, PNG o WebP");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("La imagen no puede superar 2 MB");
      return;
    }
    try {
      setProgress(0);
      const presign = await call(
        api.me["avatar-upload"].$post({
          json: { kind: "avatar", filename: file.name, contentType: file.type, sizeBytes: file.size },
        }),
      );
      await uploadToSpaces(presign, file, setProgress);
      if (!presign.publicUrl) throw new Error("No se obtuvo la URL pública de la imagen");
      await saveImage(presign.publicUrl);
      toast.success("Foto de perfil actualizada");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onRemove = async () => {
    setRemoving(true);
    try {
      await saveImage(null);
      toast.success("Foto de perfil eliminada");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <ProfileSection file="avatar.png" title="Foto de perfil" description="JPG, PNG o WebP de hasta 2 MB.">
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <UserAvatar name={name} image={image} className="size-20 text-lg" />
        <div className="flex w-full flex-1 flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
              <Camera /> {image ? "cambiar foto" : "subir foto"}
            </Button>
            {image && (
              <Button type="button" variant="ghost" disabled={busy} onClick={onRemove}>
                <Trash2 /> quitar
              </Button>
            )}
          </div>
          {progress !== null && <Progress value={progress} aria-label={`Subiendo: ${progress} %`} />}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => onFile(event.target.files?.[0])}
          />
        </div>
      </div>
    </ProfileSection>
  );
}
