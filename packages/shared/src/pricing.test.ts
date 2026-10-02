import { describe, expect, it } from "vitest";
import { priceCart } from "./pricing";

const items = [
  { courseId: "a", priceCents: 1999 },
  { courseId: "b", priceCents: 4999 },
  { courseId: "c", priceCents: 0 },
];

describe("priceCart", () => {
  it("sin cupón suma los precios", () => {
    const r = priceCart(items);
    expect(r.subtotalCents).toBe(6998);
    expect(r.discountCents).toBe(0);
    expect(r.totalCents).toBe(6998);
    expect(r.couponApplied).toBe(false);
  });

  it("cupón porcentual aplica a todas las líneas con precio", () => {
    const r = priceCart(items, { type: "percent", value: 10, appliesToAll: true, courseIds: [] });
    expect(r.lines.map((l) => l.discountCents)).toEqual([200, 500, 0]);
    expect(r.totalCents).toBe(6298);
  });

  it("cupón porcentual restringido solo aplica a sus cursos", () => {
    const r = priceCart(items, { type: "percent", value: 50, appliesToAll: false, courseIds: ["b"] });
    expect(r.lines.map((l) => l.discountCents)).toEqual([0, 2500, 0]);
  });

  it("cupón de monto fijo se reparte y la suma cuadra exacta", () => {
    const r = priceCart(items, { type: "amount", value: 1000, appliesToAll: true, courseIds: [] });
    expect(r.discountCents).toBe(1000);
    expect(r.lines.reduce((s, l) => s + l.totalCents, 0)).toBe(r.totalCents);
  });

  it("cupón de monto fijo no deja totales negativos", () => {
    const r = priceCart(items, { type: "amount", value: 999_999, appliesToAll: true, courseIds: [] });
    expect(r.totalCents).toBe(0);
    expect(r.lines.every((l) => l.totalCents >= 0)).toBe(true);
  });

  it("cupón que no aplica a ningún curso no marca couponApplied", () => {
    const r = priceCart(items, { type: "percent", value: 20, appliesToAll: false, courseIds: ["z"] });
    expect(r.couponApplied).toBe(false);
  });
});
