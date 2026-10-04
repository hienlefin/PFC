/** Provisional commerce policy — TBD Product/Legal/Finance. Snapshot onto orders. */
export const commercePolicy = {
  currency: "VND" as const,
  /** TBD: Decision Gate fee/commission */
  commissionBps: 500,
  unpaidTimeoutMinutes: 30,
  reviewAfterOrderStatus: "COMPLETED" as const,
  /** Flat shipping for physical lines — TBD */
  shippingPhysicalVnd: 30000,
  /** Demo promo codes — TBD Product */
  promos: {
    PFC50K: 50000,
  } as Record<string, number>,
};

export function splitPayout(grossVnd: number, commissionBps = commercePolicy.commissionBps) {
  const commissionVnd = Math.round((grossVnd * commissionBps) / 10000);
  const netVnd = grossVnd - commissionVnd;
  return { commissionVnd, netVnd, commissionBps };
}

export function resolvePromo(code?: string | null): number {
  if (!code) return 0;
  return commercePolicy.promos[code.trim().toUpperCase()] ?? 0;
}

export function makeOrderCode(date = new Date()): string {
  const y = String(date.getFullYear()).slice(2);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const r = Math.floor(Math.random() * 900) + 100;
  return `PFC${y}${m}${d}${r}`;
}
