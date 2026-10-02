import { formatPrice } from "@/lib/format";

/** Como formatPrice, pero muestra 0 como importe (no "Gratis"): útil en totales y KPIs. */
export function money(cents: number, currency: string) {
  if (cents === 0) {
    return new Intl.NumberFormat("es", { style: "currency", currency, minimumFractionDigits: 0 }).format(0);
  }
  return formatPrice(cents, currency);
}
