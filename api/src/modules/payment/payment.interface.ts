export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER')

export type ChargeResult =
  | { status: 'approved'; reference: string }
  | { status: 'declined'; reason: string }

export interface ChargeRequest {
  amountInCents: number
  idempotencyKey: string
}

export interface PaymentProvider {
  charge(request: ChargeRequest): Promise<ChargeResult>
}
