import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { describe, expect, it } from "vitest";
import { ThemeToggle } from "@/components/theme-toggle";
import { siteCopy } from "@/messages/fa";

describe("ThemeToggle", () => {
  it("switches the document theme class", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider attribute="class" defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: siteCopy.themeToggle }),
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
