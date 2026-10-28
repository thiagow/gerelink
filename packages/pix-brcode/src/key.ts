import { PixError } from "./errors.ts";

export type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random";

export interface PixKey {
  type: PixKeyType;
  /** Valor canônico, exatamente como entra no campo 26/01 do BR Code. */
  value: string;
}

const MAX_KEY_LENGTH = 77;
const EMAIL =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PHONE = /^\+55[1-9][0-9]9?[0-9]{8}$/;

function cpfCheckDigit(digits: readonly number[], length: number): number {
  let sum = 0;
  for (let i = 0; i < length; i++) sum += (digits[i] ?? 0) * (length + 1 - i);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

export function isValidCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const d = [...cpf].map(Number);
  return cpfCheckDigit(d, 9) === d[9] && cpfCheckDigit(d, 10) === d[10];
}

/** CNPJ numérico e alfanumérico (valor de cada caractere = código ASCII − 48). */
function cnpjCheckDigit(chars: string, length: number): number {
  let weight = length - 7;
  let sum = 0;
  for (let i = 0; i < length; i++) {
    sum += (chars.charCodeAt(i) - 48) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCnpj(cnpj: string): boolean {
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj) || /^(.)\1{13}$/.test(cnpj)) return false;
  return (
    cnpjCheckDigit(cnpj, 12) === Number(cnpj[12]) && cnpjCheckDigit(cnpj, 13) === Number(cnpj[13])
  );
}

/**
 * Classifica e normaliza uma chave Pix informada por humano.
 * Telefone exige o prefixo "+" (é o que distingue de CPF/CNPJ só com dígitos).
 */
export function parsePixKey(input: string): PixKey {
  const raw = input.trim();
  const invalid = (reason: string) => new PixError("INVALID_KEY", reason);
  if (raw.length === 0 || raw.length > MAX_KEY_LENGTH + 20)
    throw invalid("Chave vazia ou longa demais.");

  if (raw.includes("@")) {
    const value = raw.toLowerCase();
    if (value.length > MAX_KEY_LENGTH || !EMAIL.test(value)) throw invalid("E-mail inválido.");
    return { type: "email", value };
  }

  if (raw.startsWith("+")) {
    const value = `+${raw.slice(1).replace(/[\s().-]/g, "")}`;
    if (!PHONE.test(value)) throw invalid("Telefone deve estar no formato +55DDNÚMERO.");
    return { type: "phone", value };
  }

  const lower = raw.toLowerCase();
  if (UUID_V4.test(lower)) return { type: "random", value: lower };

  const compact = raw.replace(/[.\-/\s]/g, "").toUpperCase();
  if (/^\d{11}$/.test(compact)) {
    if (!isValidCpf(compact)) throw invalid("CPF com dígito verificador inválido.");
    return { type: "cpf", value: compact };
  }
  if (compact.length === 14) {
    if (!isValidCnpj(compact)) throw invalid("CNPJ com dígito verificador inválido.");
    return { type: "cnpj", value: compact };
  }
  throw invalid("Formato de chave Pix não reconhecido.");
}

/** Versão mascarada para exibição pública. Nunca revela a chave completa. */
export function maskPixKey(key: PixKey): string {
  const v = key.value;
  switch (key.type) {
    case "cpf":
      return `***.${v.slice(3, 6)}.${v.slice(6, 9)}-**`;
    case "cnpj":
      return `**.${v.slice(2, 5)}.${v.slice(5, 8)}/****-**`;
    case "phone":
      return `+55 ** *****-${v.slice(-4)}`;
    case "email": {
      const [local = "", domain = ""] = v.split("@");
      return `${local.slice(0, 2)}***@${domain}`;
    }
    case "random":
      return `${v.slice(0, 4)}••••-••••-${v.slice(-4)}`;
  }
}
