import type { PaymentGateway } from "./gateway";
import { MockPaymentGateway } from "./mock-gateway";
import { VnpayPaymentGateway } from "./vnpay-gateway";

export function getPaymentGateway(): PaymentGateway {
  const name = (process.env.PAYMENT_PROVIDER || "MOCK").toUpperCase();
  if (name === "VNPAY") return new VnpayPaymentGateway();
  return new MockPaymentGateway();
}
