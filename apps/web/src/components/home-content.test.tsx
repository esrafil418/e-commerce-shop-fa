import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeContent } from "@/components/home-content";
import { formatMoney } from "@/lib/currency";
import { siteCopy } from "@/messages/fa";

describe("storefront shell", () => {
  it("shows the Persian homepage skeleton", () => {
    render(<HomeContent query="" />);

    expect(
      screen.getByRole("heading", { level: 1, name: siteCopy.heroTitle }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(4);
  });

  it("keeps an unmatched search honest", () => {
    render(<HomeContent query="کتاب" />);

    expect(screen.getByText(/کتاب/)).toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });
});

describe("formatMoney", () => {
  it("formats rials as toman with Persian digits", () => {
    expect(formatMoney(25_000_000)).toBe("۲٬۵۰۰٬۰۰۰ تومان");
  });
});
