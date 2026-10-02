import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Términos y condiciones" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Términos y condiciones"
      updated="1 de octubre de 2026"
      sections={[
        {
          heading: "1. Objeto",
          paragraphs: [
            "Estos términos regulan el uso de la plataforma Academia y la compra de cursos en video. Al crear una cuenta o comprar un curso aceptas estas condiciones.",
          ],
        },
        {
          heading: "2. Cuenta",
          paragraphs: [
            "Eres responsable de mantener la confidencialidad de tu contraseña y de toda la actividad que ocurra en tu cuenta. La cuenta es personal e intransferible.",
          ],
        },
        {
          heading: "3. Licencia de uso de los cursos",
          paragraphs: [
            "Al comprar un curso obtienes una licencia personal, no exclusiva e intransferible para ver su contenido mientras la plataforma esté disponible. No está permitido descargar, redistribuir, revender ni compartir el contenido o el acceso a tu cuenta.",
          ],
        },
        {
          heading: "4. Pagos",
          paragraphs: [
            "Los pagos se procesan de forma segura a través de Stripe. Los precios se muestran con la moneda indicada en cada curso. Los cupones de descuento están sujetos a sus condiciones de validez y número de usos.",
          ],
        },
        {
          heading: "5. Comunidad",
          paragraphs: [
            "Los comentarios, preguntas y reseñas deben ser respetuosos y relacionados con el contenido. Podemos ocultar o eliminar cualquier contenido que incumpla estas normas.",
          ],
        },
        {
          heading: "6. Cambios",
          paragraphs: [
            "Podemos actualizar estos términos. Te avisaremos de los cambios relevantes y la versión vigente estará siempre publicada en esta página.",
          ],
        },
      ]}
    />
  );
}
