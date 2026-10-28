import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { formatBRL, parseAmountParam } from "@/lib/amount.ts";
import { resolvePlate } from "@/lib/plates.ts";
import { CopyButton } from "./copy-button.tsx";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ valor?: string | string[] }>;
};

export const metadata: Metadata = { robots: { index: false, follow: false } };

const SAFE_COLOR = /^#[0-9a-fA-F]{6}$/;

export default async function PayPage({ params, searchParams }: Props) {
  const [{ code }, { valor }] = await Promise.all([params, searchParams]);
  const amountCents = parseAmountParam(Array.isArray(valor) ? valor[0] : valor);
  const plate = await resolvePlate(code, amountCents);
  if (!plate) notFound();

  if (plate.status === "suspended") {
    return (
      <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-6 text-center">
        <div>
          <h1 className="font-serif text-4xl">Plaquinha indisponível</h1>
          <p className="mt-3 text-sm text-muted">
            Este ponto de pagamento foi desativado. Procure o estabelecimento.
          </p>
        </div>
      </main>
    );
  }

  const svg = await QRCode.toString(plate.payload, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
  const brand =
    plate.brandColor && SAFE_COLOR.test(plate.brandColor) ? plate.brandColor : "#f4f2ee";

  return (
    <main
      style={{ "--brand": brand } as React.CSSProperties}
      className="relative mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-8 pt-12"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 opacity-25 blur-3xl"
        style={{ background: "radial-gradient(60% 100% at 50% 0%, var(--brand), transparent)" }}
      />
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Pagamento via Pix</p>
        <h1 className="mt-3 font-serif text-5xl leading-[1.02] tracking-tight">
          {plate.displayName}
        </h1>
        {amountCents !== undefined && (
          <p className="mt-4 text-3xl font-medium tabular-nums">{formatBRL(amountCents)}</p>
        )}
      </header>

      <section aria-label="QR Code Pix" className="mt-10">
        <div
          role="img"
          aria-label="QR Code para pagamento Pix"
          className="mx-auto w-full max-w-[17rem] overflow-hidden rounded-3xl bg-white p-2 shadow-[0_0_0_1px_rgb(255_255_255/0.08),0_30px_80px_-20px_rgb(0_0_0/0.8)] [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG gerado localmente pela lib qrcode a partir do payload, sem HTML vindo do usuário
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="mt-4 text-center text-sm text-muted">
          Abra o app do seu banco e escolha <span className="text-paper">Pix → Ler QR Code</span>
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <CopyButton text={plate.payload} />
        <label className="block">
          <span className="sr-only">Código Pix copia e cola</span>
          <textarea
            readOnly
            rows={3}
            value={plate.payload}
            className="w-full resize-none rounded-2xl border border-line bg-surface p-3 font-mono text-[11px] leading-relaxed text-muted"
          />
        </label>
      </section>

      <footer className="mt-auto pt-10 text-center text-xs text-muted">
        <p>
          Recebedor <span className="text-paper/80">{plate.merchantName}</span> · Chave{" "}
          <span className="font-mono text-paper/80">{plate.keyMask}</span>
        </p>
        <p className="mt-1">Confira os dados no app do banco antes de confirmar.</p>
      </footer>
    </main>
  );
}
