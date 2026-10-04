import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Política de reembolsos" };

export default function RefundsPage() {
  return (
    <LegalPage
      title="Política de reembolsos"
      file="reembolsos.md"
      updated="1 de octubre de 2026"
      sections={[
        {
          heading: "Solicitar un reembolso",
          paragraphs: [
            "Si un curso no cumple tus expectativas puedes solicitar el reembolso dentro de los 14 días siguientes a la compra escribiéndonos desde el email de tu cuenta e indicando la referencia del pedido (la encontrarás en «Mis compras»).",
          ],
        },
        {
          heading: "Cómo se procesa",
          paragraphs: [
            "Los reembolsos se devuelven al mismo medio de pago a través de Stripe. Según tu banco, el importe puede tardar entre 5 y 10 días hábiles en aparecer.",
            "Al reembolsar un pedido se retira el acceso a los cursos incluidos en él.",
          ],
        },
        {
          heading: "Excepciones",
          paragraphs: [
            "Podemos rechazar solicitudes cuando detectemos un uso abusivo de la política, por ejemplo compras y reembolsos repetidos del mismo curso o cursos completados casi en su totalidad.",
          ],
        },
      ]}
    />
  );
}
