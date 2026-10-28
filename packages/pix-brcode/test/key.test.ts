import { describe, expect, it } from "vitest";
import { isValidCnpj, isValidCpf, maskPixKey, PixError, parsePixKey } from "../src/index.ts";

describe("parsePixKey", () => {
  it.each([
    ["529.982.247-25", "cpf", "52998224725"],
    ["11.222.333/0001-81", "cnpj", "11222333000181"],
    ["12.ABC.345/01DE-35", "cnpj", "12ABC34501DE35"],
    ["  Maria@Exemplo.COM ", "email", "maria@exemplo.com"],
    ["+55 (11) 98765-4321", "phone", "+5511987654321"],
    ["+551133334444", "phone", "+551133334444"],
    ["123E4567-E12B-42D1-A456-426655440000", "random", "123e4567-e12b-42d1-a456-426655440000"],
  ])("classifica %s como %s", (input, type, value) => {
    expect(parsePixKey(input)).toEqual({ type, value });
  });

  it.each([
    "",
    "111.111.111-11",
    "529.982.247-26",
    "11.222.333/0001-82",
    "12.ABC.345/01DE-36",
    "11987654321",
    "+5511",
    "+5511987654321999",
    "sem-arroba.com",
    "a@b",
    "123e4567-e12b-12d1-a456-426655440000",
    `${"a".repeat(80)}@x.com`,
  ])("rejeita %j", (input) => {
    expect(() => parsePixKey(input)).toThrow(PixError);
  });
});

describe("dígitos verificadores", () => {
  it("CPF", () => {
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCpf("00000000000")).toBe(false);
  });

  it("CNPJ numérico e alfanumérico", () => {
    expect(isValidCnpj("11222333000181")).toBe(true);
    expect(isValidCnpj("12ABC34501DE35")).toBe(true);
    expect(isValidCnpj("00000000000000")).toBe(false);
  });
});

describe("maskPixKey", () => {
  it.each([
    ["529.982.247-25", "***.982.247-**"],
    ["11.222.333/0001-81", "**.222.333/****-**"],
    ["+5511987654321", "+55 ** *****-4321"],
    ["maria@exemplo.com", "ma***@exemplo.com"],
    ["123e4567-e12b-42d1-a456-426655440000", "123e••••-••••-0000"],
  ])("mascara %s", (input, masked) => {
    expect(maskPixKey(parsePixKey(input))).toBe(masked);
  });

  it("nunca contém a chave completa", () => {
    for (const raw of ["52998224725", "maria@exemplo.com", "+5511987654321"]) {
      const key = parsePixKey(raw);
      expect(maskPixKey(key)).not.toContain(key.value);
    }
  });
});
