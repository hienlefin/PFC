export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "REFUNDED", "CANCELLED"],
  PROCESSING: ["COMPLETED", "REFUNDED", "CANCELLED"],
  COMPLETED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) {
    throw new Error(`Invalid order transition ${from} -> ${to}`);
  }
}
