import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { buildPayload, crc16, PixError, parsePayload } from "../src/index.ts";

// Payload de regressão: estrutura montada à mão, CRC gerado pelo próprio motor.
// A validação real contra bancos é manual (pagar R$0,01) — ver CLAUDE.md.
const REGRESSION_BODY =
  "00020101021126580014br.gov.bcb.pix0136123e4567-e12b-42d1-a456-426655440000520400005303986540510.005802BR5913FULANO DE TAL6008BRASILIA62070503***6304";
const REGRESSION_EXAMPLE = REGRESSION_BODY + crc16(REGRESSION_BODY);

describe("crc16", () => {
  it("bate com os vetores padrão CCITT-FALSE", () => {
    expect(crc16("123456789")).toBe("29B1");
    expect(crc16("A")).toBe("B915");
    expect(crc16("")).toBe("FFFF");
  });
});

describe("buildPayload", () => {
  const base = {
    key: "123e4567-e12b-42d1-a456-426655440000",
    merchantName: "Padaria São João Ltda",
    merchantCity: "São Paulo",
  };

  it("normaliza nome e cidade e respeita os limites", () => {
    const parsed = parsePayload(
      buildPayload({ ...base, merchantName: "Padaria e Confeitaria São João da Boa Vista" }),
    );
    expect(parsed.merchantName).toBe("PADARIA E CONFEITARIA SAO");
    expect(parsed.merchantName).toHaveLength(25);
    expect(parsed.merchantCity).toBe("SAO PAULO");
  });

  it("emite estático reutilizável, txid *** e sem valor por padrão", () => {
    const payload = buildPayload(base);
    expect(payload).toContain("010211");
    expect(payload).toContain("62070503***");
    expect(payload).not.toContain("540");
    expect(payload.startsWith("000201")).toBe(true);
  });

  it("formata valor com ponto e duas casas", () => {
    expect(buildPayload({ ...base, amountCents: 1000 })).toContain("540510.00");
    expect(buildPayload({ ...base, amountCents: 5 })).toContain("54040.05");
  });

  it("aceita descrição e txid", () => {
    const parsed = parsePayload(
      buildPayload({ ...base, description: "Pedido café", txid: "ABC123" }),
    );
    expect(parsed.description).toBe("Pedido cafe");
    expect(parsed.txid).toBe("ABC123");
  });

  it.each([0, -1, 1.5, Number.NaN, 1e15])("rejeita valor inválido %s", (amountCents) => {
    expect(() => buildPayload({ ...base, amountCents })).toThrow(PixError);
  });

  it.each(["abc-123", "", "A".repeat(26)])("rejeita txid inválido %j", (txid) => {
    expect(() => buildPayload({ ...base, txid })).toThrow(PixError);
  });

  it("rejeita nome que some na normalização", () => {
    expect(() => buildPayload({ ...base, merchantName: "日本語" })).toThrow(PixError);
  });

  it("rejeita campo 26 acima de 99 caracteres", () => {
    expect(() => buildPayload({ ...base, description: "x".repeat(80) })).toThrow(PixError);
  });
});

describe("parsePayload", () => {
  it("decodifica o payload de regressão e o motor o reproduz byte a byte", () => {
    const parsed = parsePayload(REGRESSION_EXAMPLE);
    expect(
      buildPayload({
        key: parsed.key,
        merchantName: parsed.merchantName,
        merchantCity: parsed.merchantCity,
        amountCents: 1000,
      }),
    ).toBe(REGRESSION_EXAMPLE);
    expect(parsed).toMatchObject({
      key: "123e4567-e12b-42d1-a456-426655440000",
      merchantName: "FULANO DE TAL",
      merchantCity: "BRASILIA",
      amountCents: 1000,
      txid: "***",
      reusable: true,
    });
  });

  it("detecta CRC adulterado", () => {
    const tampered = REGRESSION_EXAMPLE.replace("10.00", "99.00");
    expect(() => parsePayload(tampered)).toThrowError(
      expect.objectContaining({ code: "BAD_CHECKSUM" }),
    );
  });

  it.each(["", "6304", "000201", "00020163041234"])("rejeita payload malformado %j", (payload) => {
    expect(() => parsePayload(payload)).toThrow(PixError);
  });
});

describe("round-trip (propriedade)", () => {
  const text = fc.string({ minLength: 1, maxLength: 60 }).filter((s) => /[A-Za-z0-9]/.test(s));

  it("parse(build(x)) devolve o que foi montado e o CRC sempre fecha", () => {
    fc.assert(
      fc.property(
        text,
        text,
        fc.option(fc.integer({ min: 1, max: 99_999_999_999 }), { nil: undefined }),
        (merchantName, merchantCity, amountCents) => {
          const payload = buildPayload({
            key: "+5511987654321",
            merchantName,
            merchantCity,
            ...(amountCents === undefined ? {} : { amountCents }),
          });
          const parsed = parsePayload(payload);
          expect(parsed.key).toBe("+5511987654321");
          expect(parsed.amountCents).toBe(amountCents);
          expect(parsed.merchantName.length).toBeLessThanOrEqual(25);
          expect(parsed.merchantCity.length).toBeLessThanOrEqual(15);
          expect(parsed.merchantName).toMatch(/^[\x20-\x7e]+$/);
        },
      ),
      { numRuns: 500 },
    );
  });
});
