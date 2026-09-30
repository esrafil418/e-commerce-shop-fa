export function toggleSaved(ids: string[], productId: string): string[] {
  return ids.includes(productId)
    ? ids.filter((id) => id !== productId)
    : [...ids, productId];
}
