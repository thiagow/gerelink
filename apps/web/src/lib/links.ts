/** Origem pública eterna: tudo que é gravado em tag NFC ou impresso em QR parte daqui. */
export function appBaseUrl(): string {
  const raw = process.env.APP_BASE_URL;
  if (!raw) throw new Error("APP_BASE_URL não definida.");
  const url = new URL(raw);
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("APP_BASE_URL deve ser apenas a origem (ex.: https://gerelink.online).");
  }
  return url.origin;
}

export function plateUrl(code: string): string {
  return `${appBaseUrl()}/${code}`;
}
