import { describe, expect, it } from "vitest";
import { useShellUi } from "./use-shell-ui";

describe("useShellUi", () => {
  it("opens and closes the mobile navigation", () => {
    useShellUi.getState().closeMobileNav();
    useShellUi.getState().openMobileNav();
    expect(useShellUi.getState().mobileNavOpen).toBe(true);
    useShellUi.getState().closeMobileNav();
    expect(useShellUi.getState().mobileNavOpen).toBe(false);
  });
});
