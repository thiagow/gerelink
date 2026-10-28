import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CODE_PATTERN, generatePlateCode } from "../src/lib/code.ts";
import { decryptSecret, encryptSecret } from "../src/lib/crypto.ts";

const key = randomBytes(32);

describe("encryptSecret", () => {
  it("faz round-trip e nunca repete o ciphertext", () => {
    const a = encryptSecret("529.982.247-25", key);
    const b = encryptSecret("529.982.247-25", key);
    expect(a).not.toBe(b);
    expect(a).not.toContain("529");
    expect(decryptSecret(a, key)).toBe("529.982.247-25");
  });

  it("rejeita chave errada e payload adulterado", () => {
    const payload = encryptSecret("segredo", key);
    expect(() => decryptSecret(payload, randomBytes(32))).toThrow();
    const [v, iv, tag, ct] = payload.split(".");
    const flipped = `${v}.${iv}.${tag}.${ct?.slice(0, -2)}AA`;
    expect(() => decryptSecret(flipped, key)).toThrow();
    expect(() => decryptSecret("lixo", key)).toThrow();
  });
});

describe("generatePlateCode", () => {
  it("gera 8 caracteres base58 e não colide em amostra grande", () => {
    const codes = new Set(Array.from({ length: 5000 }, generatePlateCode));
    expect(codes.size).toBe(5000);
    for (const c of codes) expect(c).toMatch(CODE_PATTERN);
  });
});
