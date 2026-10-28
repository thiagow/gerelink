import * as OTPAuth from "otpauth";

const PERIOD = 30;
const ISSUER = "LinkQ";

function build(secretBase32: string, label = "operador"): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: PERIOD,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

export function totpUri(secretBase32: string, label: string): string {
  return build(secretBase32, label).toString();
}

/**
 * Valida o código (janela ±1 passo) e devolve o número do passo aceito, ou null.
 * O chamador deve recusar passos <= ao último já usado para impedir replay.
 */
export function checkTotp(secretBase32: string, token: string, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(token)) return null;
  const delta = build(secretBase32).validate({ token, timestamp: now, window: 1 });
  if (delta === null) return null;
  return Math.floor(now / 1000 / PERIOD) + delta;
}

export function generateTotp(secretBase32: string, now = Date.now()): string {
  return build(secretBase32).generate({ timestamp: now });
}
