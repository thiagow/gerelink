import { crc16 } from "./crc16.ts";
import { PixError } from "./errors.ts";
import { type PixKey, parsePixKey } from "./key.ts";
import { normalizeText, toPrintableAscii } from "./text.ts";

export const MAX_NAME_LENGTH = 25;
export const MAX_CITY_LENGTH = 15;
export const PIX_GUI = "br.gov.bcb.pix";

export interface PixPayloadInput {
  /** Chave Pix como o humano digitou; é classificada e normalizada. */
  key: string | PixKey;
  merchantName: string;
  merchantCity: string;
  /** Valor em centavos (inteiro > 0). Omitido = o pagador digita o valor. */
  amountCents?: number;
  /** 1–25 alfanuméricos. Omitido = "***". */
  txid?: string;
  /** Mensagem ao pagador (campo 26/02). */
  description?: string;
}

/** Codifica um campo EMV: ID (2) + tamanho em caracteres (2) + valor. */
export function field(id: string, value: string): string {
  if (value.length > 99) {
    throw new PixError("FIELD_TOO_LONG", `Campo ${id} excede 99 caracteres.`);
  }
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

export function formatAmount(amountCents: number): string {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new PixError("INVALID_AMOUNT", "O valor deve ser um inteiro positivo em centavos.");
  }
  const text = `${Math.trunc(amountCents / 100)}.${(amountCents % 100).toString().padStart(2, "0")}`;
  if (text.length > 13)
    throw new PixError("INVALID_AMOUNT", "Valor acima do limite de 13 caracteres.");
  return text;
}

export function buildPayload(input: PixPayloadInput): string {
  const key = typeof input.key === "string" ? parsePixKey(input.key) : input.key;
  const name = normalizeText(input.merchantName, MAX_NAME_LENGTH, "INVALID_NAME");
  const city = normalizeText(input.merchantCity, MAX_CITY_LENGTH, "INVALID_CITY");

  const txid = input.txid ?? "***";
  if (txid !== "***" && !/^[A-Za-z0-9]{1,25}$/.test(txid)) {
    throw new PixError("INVALID_TXID", "txid deve ter de 1 a 25 caracteres alfanuméricos.");
  }

  let account = field("00", PIX_GUI) + field("01", key.value);
  if (input.description !== undefined) {
    const description = toPrintableAscii(input.description);
    if (description.length === 0) {
      throw new PixError("INVALID_DESCRIPTION", "Descrição vazia após normalização.");
    }
    account += field("02", description);
  }

  const body =
    field("00", "01") +
    field("01", "11") +
    field("26", account) +
    field("52", "0000") +
    field("53", "986") +
    (input.amountCents === undefined ? "" : field("54", formatAmount(input.amountCents))) +
    field("58", "BR") +
    field("59", name) +
    field("60", city) +
    field("62", field("05", txid)) +
    "6304";

  return body + crc16(body);
}
