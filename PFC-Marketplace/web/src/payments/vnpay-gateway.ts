import type { CreatePaymentInput, CreatePaymentResult, CallbackResult, PaymentGateway } from "./gateway";

/**
 * VNPAY adapter stub — wires env credentials when onboarding completes (#218).
 * Throws until VNPAY_TMN_CODE + VNPAY_HASH_SECRET are configured.
 */
export class VnpayPaymentGateway implements PaymentGateway {
  readonly name = "VNPAY" as const;

  async createPayment(_input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!process.env.VNPAY_TMN_CODE || !process.env.VNPAY_HASH_SECRET) {
      throw new Error("VNPAY credentials not configured — use PAYMENT_PROVIDER=MOCK locally");
    }
    throw new Error("VNPAY createPayment not certified in this environment yet");
  }

  async parseCallback(_params: Record<string, string>): Promise<CallbackResult> {
    throw new Error("VNPAY parseCallback not certified in this environment yet");
  }
}
