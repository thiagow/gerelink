import { randomInt } from "node:crypto";

// Base58 sem 0/O/I/l: legível em plaquinha impressa e sem ambiguidade ao digitar.
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export const CODE_LENGTH = 8;
export const CODE_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{8}$/;

/** Código aleatório criptograficamente seguro (~46 bits): não sequencial, não enumerável. */
export function generatePlateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}
