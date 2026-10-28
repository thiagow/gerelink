import type { Metadata } from "next";
import Link from "next/link";
import { requireOperator } from "@/lib/session.ts";
import { logoutAction } from "../login/actions.ts";

export const metadata: Metadata = {
  title: "LinkQ · Painel",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireOperator();

  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-5 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-5">
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/admin" className="font-serif text-2xl tracking-tight">
            LinkQ
          </Link>
          <Link href="/admin" className="text-muted transition hover:text-paper">
            Plaquinhas
          </Link>
          <Link href="/admin/customers/new" className="text-muted transition hover:text-paper">
            Novo cliente
          </Link>
          <Link href="/admin/audit" className="text-muted transition hover:text-paper">
            Auditoria
          </Link>
          <Link href="/admin/account" className="text-muted transition hover:text-paper">
            Conta
          </Link>
        </nav>
        <form action={logoutAction} className="flex items-center gap-3 text-sm text-muted">
          <span className="hidden sm:inline">{session.email}</span>
          <button
            type="submit"
            className="underline-offset-4 transition hover:text-paper hover:underline"
          >
            Sair
          </button>
        </form>
      </header>
      <main className="pt-8">{children}</main>
    </div>
  );
}
