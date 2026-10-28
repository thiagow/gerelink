import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";
import { resolveSsl } from "./ssl.ts";

const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

const isProduction = process.env.NODE_ENV === "production";

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida.");
  const { ssl, insecureProduction } = resolveSsl(process.env);
  if (insecureProduction) {
    console.warn("[db] DATABASE_SSL=disable: conexão com o Postgres SEM TLS em produção.");
  }
  return postgres(url, {
    // Serverless: cada instância da função segura 1 conexão (o servidor tem limite baixo e
    // várias instâncias rodam em paralelo). Em dev, um pequeno pool.
    max: isProduction ? 1 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl,
  });
}

const sql = globalForDb.sql ?? connect();
if (!isProduction) globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
