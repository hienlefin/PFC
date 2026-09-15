import { nanoid } from "nanoid";
import type { CreatePaymentInput, CreatePaymentResult, CallbackResult, PaymentGateway } from "./gateway";

/** Local/dev gateway — same port as VNPAY. Not for production go-live. */
export class MockPaymentGateway implements PaymentGateway {
  readonly name = "MOCK" as const;

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const providerRef = `mock_${nanoid(12)}`;
    const url = new URL(input.returnUrl);
    url.searchParams.set("providerRef", providerRef);
    url.searchParams.set("amount", String(input.amountVnd));
    url.searchParams.set("result", "success");
    return { providerRef, redirectUrl: url.toString() };
  }

  async parseCallback(params: Record<string, string>): Promise<CallbackResult> {
    const providerRef = params.providerRef || "";
    const amountVnd = Number(params.amount || 0);
    const success = params.result === "success";
    if (!providerRef) throw new Error("Missing providerRef");
    return { providerRef, success, amountVnd };
  }
}
