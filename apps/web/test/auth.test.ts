import { describe, expect, it } from "vitest";
import { appBaseUrl, plateUrl } from "../src/lib/links.ts";
import { hashPassword, validateNewPassword, verifyPassword } from "../src/lib/password.ts";
import { checkTotp, generateTotp, generateTotpSecret, totpUri } from "../src/lib/totp.ts";

describe("password", () => {
  it("faz round-trip, usa salt e rejeita senha errada ou hash malformado", async () => {
    const a = await hashPassword("uma senha bem longa 123");
    const b = await hashPassword("uma senha bem longa 123");
    expect(a).not.toBe(b);
    expect(await verifyPassword("uma senha bem longa 123", a)).toBe(true);
    expect(await verifyPassword("outra senha qualquer", a)).toBe(false);
    expect(await verifyPassword("x", "lixo")).toBe(false);
  });
});

describe("validateNewPassword", () => {
  it("aceita senha longa e recusa curta, repetida e com o e-mail", () => {
    expect(validateNewPassword("uma-senha-bem-longa-9", "contato@x.com")).toBeNull();
    expect(validateNewPassword("curta", "contato@x.com")).toMatch(/mínimo 12/);
    expect(validateNewPassword("aaaaaaaaaaaaaaaa", "contato@x.com")).toMatch(/fraca/);
    expect(validateNewPassword("minha-contato-123456", "contato@x.com")).toMatch(/e-mail/);
    expect(validateNewPassword(`${"x".repeat(200)}y`, "a@b.com")).toMatch(/máximo/);
  });
});

describe("totp", () => {
  const secret = generateTotpSecret();
  const now = Date.UTC(2026, 9, 27, 12, 0, 0);

  it("aceita o código atual e devolve o passo", () => {
    const step = checkTotp(secret, generateTotp(secret, now), now);
    expect(step).toBe(Math.floor(now / 1000 / 30));
  });

  it("tolera ±1 passo e rejeita além disso", () => {
    const old = generateTotp(secret, now - 30_000);
    expect(checkTotp(secret, old, now)).toBe(Math.floor(now / 1000 / 30) - 1);
    expect(checkTotp(secret, generateTotp(secret, now - 120_000), now)).toBeNull();
  });

  it.each(["", "12345", "1234567", "abcdef"])("rejeita formato inválido %j", (token) => {
    expect(checkTotp(secret, token, now)).toBeNull();
  });

  it("gera URI otpauth com o emissor", () => {
    expect(totpUri(secret, "a@b.com")).toMatch(/^otpauth:\/\/totp\/LinkQ:a%40b\.com\?/);
  });
});

describe("links", () => {
  it("monta a URL eterna da plaquinha e rejeita base com path", () => {
    process.env.APP_BASE_URL = "https://gerelink.online";
    expect(plateUrl("raN3FXDf")).toBe("https://gerelink.online/raN3FXDf");
    process.env.APP_BASE_URL = "https://gerelink.online/app";
    expect(() => appBaseUrl()).toThrow();
  });
});
