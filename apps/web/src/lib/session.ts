import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, lt, ne, or } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db/client.ts";
import { operators, sessions } from "@/db/schema.ts";
import { decryptSecret } from "./crypto.ts";
import { checkTotp } from "./totp.ts";

const COOKIE = "lq_session";
const PRE_MFA_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

async function writeCookie(token: string, ttlMs: number) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(ttlMs / 1000),
  });
}

async function issue(operatorId: string, mfaVerified: boolean) {
  const token = randomBytes(32).toString("base64url");
  const ttl = mfaVerified ? SESSION_TTL_MS : PRE_MFA_TTL_MS;
  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    operatorId,
    mfaVerified,
    expiresAt: new Date(Date.now() + ttl),
  });
  await writeCookie(token, ttl);
}

/** Sessão parcial: senha ok, aguardando o segundo fator. */
export async function startSession(operatorId: string) {
  await issue(operatorId, false);
}

export const getSession = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({
      tokenHash: sessions.tokenHash,
      mfaVerified: sessions.mfaVerified,
      operatorId: operators.id,
      email: operators.email,
    })
    .from(sessions)
    .innerJoin(operators, eq(sessions.operatorId, operators.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
});

/** Troca a sessão parcial por uma completa com token novo (evita fixação de sessão). */
export async function promoteSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  await db.delete(sessions).where(eq(sessions.tokenHash, session.tokenHash));
  await issue(session.operatorId, true);
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  store.delete(COOKIE);
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

/** Encerra todas as sessões do operador, exceto a atual (usado após trocar a senha). */
export async function revokeOtherSessions(operatorId: string, keepTokenHash: string) {
  await db
    .delete(sessions)
    .where(and(eq(sessions.operatorId, operatorId), ne(sessions.tokenHash, keepTokenHash)));
}

/** Exige operador com senha e MFA concluídos. Use em TODA página e ação do painel. */
export async function requireOperator() {
  const session = await getSession();
  if (!session?.mfaVerified) redirect("/login");
  return session;
}

/**
 * Valida um código TOTP do operador contra o segredo cifrado e consome o passo
 * de forma atômica: o mesmo código nunca vale duas vezes.
 */
export async function consumeTotp(operatorId: string, code: string): Promise<boolean> {
  const [operator] = await db
    .select({ secret: operators.totpSecretEnc })
    .from(operators)
    .where(eq(operators.id, operatorId))
    .limit(1);
  if (!operator) return false;
  const step = checkTotp(decryptSecret(operator.secret), code);
  if (step === null) return false;
  const updated = await db
    .update(operators)
    .set({ totpLastStep: step })
    .where(
      and(
        eq(operators.id, operatorId),
        or(isNull(operators.totpLastStep), lt(operators.totpLastStep, step)),
      ),
    )
    .returning({ id: operators.id });
  return updated.length === 1;
}

/**
 * IP do cliente para rate limit. Na Netlify, `x-nf-client-connection-ip` é definido pela borda
 * (o cliente não consegue forjá-lo); x-forwarded-for fica só como fallback de dev local.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return h.get("x-nf-client-connection-ip") || forwarded?.split(",")[0]?.trim() || "unknown";
}
