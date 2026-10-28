import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";

function loadKey(): Buffer {
  const raw = process.env.PIX_KEY_ENCRYPTION_KEY;
  if (!raw) throw new Error("PIX_KEY_ENCRYPTION_KEY não definida.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("PIX_KEY_ENCRYPTION_KEY deve ter 32 bytes em base64.");
  return key;
}

/** AES-256-GCM. Formato: v1.<iv>.<tag>.<ciphertext> (base64url). */
export function encryptSecret(plaintext: string, key: Buffer = loadKey()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), ciphertext]
    .map((p) => (typeof p === "string" ? p : p.toString("base64url")))
    .join(".");
}

export function decryptSecret(payload: string, key: Buffer = loadKey()): string {
  const [version, iv, tag, ciphertext] = payload.split(".");
  if (version !== VERSION || !iv || !tag || !ciphertext)
    throw new Error("Payload cifrado inválido.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
