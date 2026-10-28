import { describe, expect, it } from "vitest";
import { parseAmountParam } from "../src/lib/amount.ts";

describe("parseAmountParam", () => {
  it.each([
    ["50", 5000],
    ["50.5", 5050],
    ["50,50", 5050],
    ["1.234,56", 123456],
    ["0.01", 1],
  ])("lê %s", (input, cents) => {
    expect(parseAmountParam(input)).toBe(cents);
  });

  it.each([undefined, "", "0", "-5", "abc", "1e3", "10.999", "99999999", "50;drop"])(
    "rejeita %j",
    (input) => {
      expect(parseAmountParam(input)).toBeUndefined();
    },
  );
});
