import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db/client.ts";

/** Incrementa o contador da janela de forma atômica. Devolve true se ainda está dentro do limite. */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const rows = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.count + 1 END,
      reset_at = CASE WHEN rate_limits.reset_at < now()
        THEN now() + make_interval(secs => ${windowSeconds}) ELSE rate_limits.reset_at END
    RETURNING count
  `);
  return (rows[0]?.count ?? Number.POSITIVE_INFINITY) <= limit;
}
