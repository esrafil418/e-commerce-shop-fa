const key = "recent-searches:v1";
const limit = 8;

export function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is string => typeof item === "string").slice(0, limit);
  } catch {
    return [];
  }
}

export function rememberSearch(query: string) {
  const next = [query, ...readRecentSearches().filter((item) => item !== query)].slice(0, limit);
  window.localStorage.setItem(key, JSON.stringify(next));
}

export function clearRecentSearches() {
  window.localStorage.removeItem(key);
}
