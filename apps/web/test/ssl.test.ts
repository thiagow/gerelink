import { describe, expect, it } from "vitest";
import { resolveSsl } from "../src/db/ssl.ts";

describe("resolveSsl", () => {
  it("exige TLS em produção por padrão", () => {
    expect(resolveSsl({ NODE_ENV: "production" })).toEqual({
      ssl: "require",
      insecureProduction: false,
    });
  });

  it("só desliga com opt-out explícito e sinaliza o risco", () => {
    expect(resolveSsl({ NODE_ENV: "production", DATABASE_SSL: "disable" })).toEqual({
      ssl: false,
      insecureProduction: true,
    });
    expect(resolveSsl({ NODE_ENV: "production", DATABASE_SSL: "off" }).ssl).toBe("require");
  });

  it("não usa TLS fora de produção", () => {
    expect(resolveSsl({ NODE_ENV: "development" })).toEqual({
      ssl: false,
      insecureProduction: false,
    });
    expect(resolveSsl({})).toEqual({ ssl: false, insecureProduction: false });
  });
});
