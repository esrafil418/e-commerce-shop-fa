import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/currency";

describe("formatMoney", () => {
  it("formats rials as toman with Persian digits", () => {
    expect(formatMoney(25_000_000)).toBe("۲٬۵۰۰٬۰۰۰ تومان");
  });
});
