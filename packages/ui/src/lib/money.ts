/** 1 Toman = 10 Rial. Stored amounts are integer rials. */
export const RIALS_PER_TOMAN = 10;

export function rialToToman(amountRial: number): number {
  if (!Number.isSafeInteger(amountRial)) {
    throw new Error("مبلغ باید یک عدد صحیح ریال در محدوده امن جاوااسکریپت باشد.");
  }

  return amountRial / RIALS_PER_TOMAN;
}

export function formatMoney(amountRial: number): string {
  const toman = rialToToman(amountRial);
  const formatted = new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: Number.isInteger(toman) ? 0 : 1,
  }).format(toman);

  return `${formatted} تومان`;
}
