import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      file="privacidad.md"
      updated="1 de octubre de 2026"
      sections={[
        {
          heading: "Datos que recogemos",
          paragraphs: [
            "Tu nombre, email y contraseña (cifrada) al registrarte; tu foto de perfil si decides subirla; tus compras, progreso en los cursos, comentarios, preguntas y reseñas.",
            "No almacenamos los datos de tu tarjeta: los pagos los procesa Stripe.",
          ],
        },
        {
          heading: "Para qué los usamos",
          paragraphs: [
            "Para darte acceso a los cursos que compras, guardar tu progreso, emitir certificados, enviarte emails transaccionales (confirmación de cuenta, recibos, respuestas a tus preguntas) y mejorar la plataforma.",
          ],
        },
        {
          heading: "Proveedores",
          paragraphs: [
            "Usamos proveedores de confianza para operar el servicio: Stripe (pagos), Cloudflare (reproducción de video), Resend (envío de emails) y DigitalOcean (almacenamiento de archivos).",
          ],
        },
        {
          heading: "Tus derechos",
          paragraphs: [
            "Puedes acceder, corregir o eliminar tus datos, y oponerte a su tratamiento, escribiéndonos desde el email de tu cuenta. Puedes actualizar tu nombre, foto y contraseña desde tu perfil.",
          ],
        },
      ]}
    />
  );
}
