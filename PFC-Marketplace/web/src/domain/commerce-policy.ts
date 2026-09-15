/** Provisional commerce policy — TBD Product/Legal/Finance. Snapshot onto orders. */
export const commercePolicy = {
  currency: "VND" as const,
  /** TBD: Decision Gate fee/commission */
  commissionBps: 500,
  unpaidTimeoutMinutes: 30,
  reviewAfterOrderStatus: "COMPLETED" as const,
};

export function splitPayout(grossVnd: number, commissionBps = commercePolicy.commissionBps) {
  const commissionVnd = Math.round((grossVnd * commissionBps) / 10000);
  const netVnd = grossVnd - commissionVnd;
  return { commissionVnd, netVnd, commissionBps };
}
