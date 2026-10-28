import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";
import { resolveSsl } from "./ssl.ts";

type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { db?: Db };

const isProduction = process.env.NODE_ENV === "production";

function connect(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida.");
  const { ssl, insecureProduction } = resolveSsl(process.env);
  if (insecureProduction) {
    console.warn("[db] DATABASE_SSL=disable: conexão com o Postgres SEM TLS em produção.");
  }
  const sql = postgres(url, {
    // Serverless: cada instância da função segura 1 conexão (o servidor tem limite baixo e
    // várias instâncias rodam em paralelo). Em dev, um pequeno pool.
    max: isProduction ? 1 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl,
  });
  return drizzle(sql, { schema });
}

let instance: Db | undefined;

function getDb(): Db {
  instance ??= globalForDb.db ?? connect();
  // Em dev o HMR recarrega módulos; reaproveitar evita vazar conexões.
  if (!isProduction) globalForDb.db = instance;
  return instance;
}

/**
 * Conexão preguiçosa: só abre no primeiro uso. Importar este módulo (por exemplo durante
 * `next build`, que carrega todas as rotas) nunca exige DATABASE_URL.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, property) {
    const real = getDb();
    const value = Reflect.get(real, property, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
