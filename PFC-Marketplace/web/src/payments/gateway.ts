export type CreatePaymentInput = {
  orderId: string;
  amountVnd: number;
  idempotencyKey: string;
  returnUrl: string;
};

export type CreatePaymentResult = {
  providerRef: string;
  redirectUrl: string;
};

export type CallbackResult = {
  providerRef: string;
  success: boolean;
  amountVnd: number;
  raw?: string;
};

export interface PaymentGateway {
  readonly name: "MOCK" | "VNPAY";
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  parseCallback(params: Record<string, string>): Promise<CallbackResult>;
}
