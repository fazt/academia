import { describe, expect, it, vi } from "vitest";

// isChapterComplete es pura; se aísla de la base de datos y del correo.
vi.mock("../db", () => ({ db: {} }));
vi.mock("../lib/email", () => ({ emails: {}, sendEmail: vi.fn() }));

const { isChapterComplete, generateCertificateCode } = await import("./progress");

const firstSeenAt = new Date("2026-01-01T10:00:00Z");
const at = (seconds: number) => new Date(firstSeenAt.getTime() + seconds * 1000);

describe("isChapterComplete", () => {
  it("completa al llegar al 90 % tras tiempo real suficiente", () => {
    expect(
      isChapterComplete({ durationSec: 600, maxPositionSec: 545, ended: false, firstSeenAt, now: at(400) }),
    ).toBe(true);
  });

  it("no completa por debajo del 90 %", () => {
    expect(
      isChapterComplete({ durationSec: 600, maxPositionSec: 500, ended: false, firstSeenAt, now: at(600) }),
    ).toBe(false);
  });

  it("no completa si se salta al final sin haber pasado tiempo real (API directa)", () => {
    expect(
      isChapterComplete({ durationSec: 600, maxPositionSec: 600, ended: true, firstSeenAt, now: at(20) }),
    ).toBe(false);
  });

  it("admite ver el video a 2x", () => {
    expect(
      isChapterComplete({ durationSec: 600, maxPositionSec: 600, ended: true, firstSeenAt, now: at(300) }),
    ).toBe(true);
  });

  it("un capítulo sin duración conocida nunca se completa", () => {
    expect(
      isChapterComplete({ durationSec: 0, maxPositionSec: 0, ended: true, firstSeenAt, now: at(9999) }),
    ).toBe(false);
  });
});

describe("generateCertificateCode", () => {
  it("genera códigos con formato XXXXX-XXXXX sin caracteres ambiguos", () => {
    const code = generateCertificateCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
  });
});
