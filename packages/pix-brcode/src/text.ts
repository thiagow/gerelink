import { PixError, type PixErrorCode } from "./errors.ts";

/** Remove acentos e qualquer caractere fora do ASCII imprimível (32–126). */
export function toPrintableAscii(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normaliza nome do recebedor / cidade: ASCII sem acento, maiúsculas, espaços colapsados.
 * Trunca em `maxLength` (a especificação limita em caracteres, não em bytes).
 */
export function normalizeText(
  input: string,
  maxLength: number,
  errorCode: Extract<PixErrorCode, "INVALID_NAME" | "INVALID_CITY">,
): string {
  const normalized = toPrintableAscii(input).toUpperCase().slice(0, maxLength).trim();
  if (normalized.length === 0) {
    throw new PixError(errorCode, "O texto fica vazio após a normalização para ASCII.");
  }
  return normalized;
}
