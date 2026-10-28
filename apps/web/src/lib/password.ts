import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// scrypt (memory-hard) da stdlib: sem dependência nativa. N=2^15, r=8 ≈ 32 MB por hash.
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const MAX_MEM = 128 * N * R * 2;

export const MIN_PASSWORD_LENGTH = 12;

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      KEY_LENGTH,
      { N: n, r, p, maxmem: MAX_MEM },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

/** Formato: scrypt$N$r$p$salt$hash (base64url). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await derive(
    password,
    Buffer.from(salt, "base64url"),
    Number(n),
    Number(r),
    Number(p),
  );
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const MAX_PASSWORD_LENGTH = 128;

/** Regras da nova senha. Devolve a mensagem de erro ou null se estiver válida. */
export function validateNewPassword(password: string, email: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A nova senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `A nova senha deve ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.`;
  }
  if (/^(.)\1+$/.test(password)) return "A nova senha é fraca demais.";
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && password.toLowerCase().includes(local)) {
    return "A nova senha não pode conter o seu e-mail.";
  }
  return null;
}

let dummyHash: Promise<string> | undefined;

/** Gasta o mesmo tempo de um login real quando o e-mail não existe (evita enumeração por timing). */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword("linkq-dummy-password");
  await verifyPassword(password, await dummyHash);
}
