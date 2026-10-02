export interface PresignedPost {
  url: string;
  fields: Record<string, string>;
  key: string;
  publicUrl: string | null;
}

/**
 * Sube un archivo a DigitalOcean Spaces con un POST prefirmado. Usa XHR para
 * poder informar del progreso. El bucket debe permitir POST desde el origen de la web (CORS).
 */
export function uploadToSpaces(presign: PresignedPost, file: File, onProgress?: (percent: number) => void) {
  const form = new FormData();
  for (const [key, value] of Object.entries(presign.fields)) form.append(key, value);
  form.append("file", file);

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", presign.url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`El almacenamiento rechazó el archivo (${xhr.status})`));
    };
    xhr.onerror = () =>
      reject(new Error("No se pudo subir el archivo. Revisa la configuración CORS del bucket."));
    xhr.send(form);
  });
}
