export type SslMode = false | "require";

/**
 * TLS do Postgres. Em produção o padrão é exigir TLS (falha fechada).
 * `DATABASE_SSL=disable` é um opt-out explícito e consciente: senha e dados trafegam em texto puro.
 */
export function resolveSsl(env: {
  NODE_ENV?: string | undefined;
  DATABASE_SSL?: string | undefined;
}): {
  ssl: SslMode;
  insecureProduction: boolean;
} {
  if (env.NODE_ENV !== "production") return { ssl: false, insecureProduction: false };
  if (env.DATABASE_SSL === "disable") return { ssl: false, insecureProduction: true };
  return { ssl: "require", insecureProduction: false };
}
