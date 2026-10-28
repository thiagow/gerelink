export type PixErrorCode =
  | "INVALID_KEY"
  | "INVALID_NAME"
  | "INVALID_CITY"
  | "INVALID_AMOUNT"
  | "INVALID_TXID"
  | "INVALID_DESCRIPTION"
  | "FIELD_TOO_LONG"
  | "MALFORMED_PAYLOAD"
  | "BAD_CHECKSUM";

export class PixError extends Error {
  readonly code: PixErrorCode;

  constructor(code: PixErrorCode, message: string) {
    super(message);
    this.name = "PixError";
    this.code = code;
  }
}
