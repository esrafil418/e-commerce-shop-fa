export function clientIp(headerStore: Headers): string {
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first.slice(0, 80);
    }
  }
  const realIp = headerStore.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp.slice(0, 80);
  }
  return "unknown";
}
