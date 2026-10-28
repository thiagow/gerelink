const MAX_AMOUNT_CENTS = 100_000_000; // R$ 1.000.000,00

/** Lê "50", "50.5", "50,50" ou "1.234,56" de ?valor= e devolve centavos. Inválido ou fora do limite = undefined. */
export function parseAmountParam(raw: string | undefined): number | undefined {
  if (!raw || raw.length > 14) return undefined;
  const text = raw.trim();
  const normalized = /,\d{1,2}$/.test(text)
    ? text.replace(/\./g, "").replace(",", ".")
    : text.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return undefined;
  const [whole = "0", fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return cents > 0 && cents <= MAX_AMOUNT_CENTS ? cents : undefined;
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
