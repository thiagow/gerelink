import { redirect } from "next/navigation";
import { getSession } from "@/lib/session.ts";
import { buttonPrimary, input, label } from "../../ui.ts";
import { mfaAction } from "../actions.ts";

export const dynamic = "force-dynamic";

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.mfaVerified) redirect("/admin");
  const { error } = await searchParams;

  return (
    <main className="mx-auto grid min-h-dvh max-w-sm content-center px-6">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Verificação em duas etapas</p>
      <h1 className="mt-3 font-serif text-5xl leading-none tracking-tight">Código</h1>
      <p className="mt-4 text-sm text-muted">
        Digite o código de 6 dígitos do seu app autenticador.
      </p>
      <form action={mfaAction} className="mt-8 space-y-5">
        <div>
          <label htmlFor="code" className={label}>
            Código
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            required
            // biome-ignore lint/a11y/noAutofocus: tela de uma única entrada; foco imediato é o comportamento esperado
            autoFocus
            className={`${input} text-center font-mono text-xl tracking-[0.4em]`}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-400">
            Código inválido ou já utilizado.
          </p>
        )}
        <button type="submit" className={`${buttonPrimary} w-full`}>
          Verificar
        </button>
      </form>
    </main>
  );
}
