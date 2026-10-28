import { crc16 } from "./crc16.ts";
import { PixError } from "./errors.ts";
import { PIX_GUI } from "./payload.ts";

export interface ParsedPayload {
  key: string;
  merchantName: string;
  merchantCity: string;
  amountCents: number | undefined;
  txid: string | undefined;
  description: string | undefined;
  reusable: boolean;
}

function readTlv(source: string): Map<string, string> {
  const fields = new Map<string, string>();
  let pos = 0;
  while (pos < source.length) {
    const id = source.slice(pos, pos + 2);
    const lengthText = source.slice(pos + 2, pos + 4);
    if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(lengthText)) {
      throw new PixError("MALFORMED_PAYLOAD", `Cabeçalho TLV inválido na posição ${pos}.`);
    }
    const end = pos + 4 + Number(lengthText);
    if (end > source.length) {
      throw new PixError("MALFORMED_PAYLOAD", `Campo ${id} ultrapassa o fim do payload.`);
    }
    if (fields.has(id)) throw new PixError("MALFORMED_PAYLOAD", `Campo ${id} duplicado.`);
    fields.set(id, source.slice(pos + 4, end));
    pos = end;
  }
  return fields;
}

function required(fields: Map<string, string>, id: string): string {
  const value = fields.get(id);
  if (value === undefined) throw new PixError("MALFORMED_PAYLOAD", `Campo ${id} ausente.`);
  return value;
}

/** Decodifica e valida um BR Code Pix (estrutura + CRC). */
export function parsePayload(payload: string): ParsedPayload {
  const crcIndex = payload.length - 8;
  if (crcIndex < 0 || payload.slice(crcIndex, crcIndex + 4) !== "6304") {
    throw new PixError("MALFORMED_PAYLOAD", "Campo 63 (CRC) ausente ou fora do fim do payload.");
  }
  const expected = crc16(payload.slice(0, crcIndex + 4));
  if (payload.slice(crcIndex + 4).toUpperCase() !== expected) {
    throw new PixError("BAD_CHECKSUM", "CRC16 não confere.");
  }

  const fields = readTlv(payload.slice(0, crcIndex));
  if (required(fields, "00") !== "01")
    throw new PixError("MALFORMED_PAYLOAD", "Versão não suportada.");

  const account = readTlv(required(fields, "26"));
  if (required(account, "00").toLowerCase() !== PIX_GUI) {
    throw new PixError("MALFORMED_PAYLOAD", "GUI do arranjo não é br.gov.bcb.pix.");
  }

  const amount = fields.get("54");
  if (amount !== undefined && !/^\d+\.\d{2}$/.test(amount)) {
    throw new PixError("MALFORMED_PAYLOAD", "Valor em formato inválido.");
  }
  const txid = fields.has("62") ? readTlv(required(fields, "62")).get("05") : undefined;

  return {
    key: required(account, "01"),
    merchantName: required(fields, "59"),
    merchantCity: required(fields, "60"),
    amountCents: amount === undefined ? undefined : Math.round(Number(amount) * 100),
    txid,
    description: account.get("02"),
    reusable: fields.get("01") === "11",
  };
}
