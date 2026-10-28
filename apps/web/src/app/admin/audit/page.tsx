import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client.ts";
import { auditLog, operators } from "@/db/schema.ts";
import { requireOperator } from "@/lib/session.ts";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" });

export default async function AuditPage() {
  await requireOperator();
  const rows = await db
    .select({ entry: auditLog, email: operators.email })
    .from(auditLog)
    .leftJoin(operators, eq(auditLog.operatorId, operators.id))
    .orderBy(desc(auditLog.id))
    .limit(150);

  return (
    <>
      <h1 className="font-serif text-4xl tracking-tight">Auditoria</h1>
      <p className="mt-1 text-sm text-muted">Registro imutável das últimas {rows.length} ações.</p>
      <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-4 py-3 font-normal">Quando</th>
              <th className="px-4 py-3 font-normal">Operador</th>
              <th className="px-4 py-3 font-normal">Ação</th>
              <th className="px-4 py-3 font-normal">Plaquinha</th>
              <th className="px-4 py-3 font-normal">Detalhe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ entry, email }) => (
              <tr key={entry.id}>
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  {dateFormat.format(entry.createdAt)}
                </td>
                <td className="px-4 py-3">{email ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{entry.action}</td>
                <td className="px-4 py-3 font-mono text-xs">{entry.plateCode ?? "—"}</td>
                <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-muted">
                  {JSON.stringify(entry.detail)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
