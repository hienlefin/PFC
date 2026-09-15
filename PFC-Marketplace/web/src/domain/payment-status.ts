export type PaymentStatus =
  | "INITIATED"
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

const ALLOWED: Record<PaymentStatus, PaymentStatus[]> = {
  INITIATED: ["PENDING", "CANCELLED"],
  PENDING: ["SUCCESS", "FAILED", "CANCELLED"],
  SUCCESS: ["REFUNDED"],
  FAILED: ["PENDING"],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertPaymentTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!canTransitionPayment(from, to)) {
    throw new Error(`Invalid payment transition ${from} -> ${to}`);
  }
}
