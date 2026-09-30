const fallbackPath = "/";

export function sanitizeRedirectPath(
  input: string | null | undefined,
  fallback = fallbackPath,
): string {
  if (!input) {
    return fallback;
  }

  const value = input.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  if (value.includes("\\") || value.includes("://") || value.includes("\0")) {
    return fallback;
  }

  try {
    const decoded = decodeURIComponent(value);
    if (
      decoded.startsWith("//") ||
      decoded.includes("\\") ||
      decoded.includes("://")
    ) {
      return fallback;
    }
  } catch {
    return fallback;
  }

  return value;
}
