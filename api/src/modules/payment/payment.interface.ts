export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER')

/**
 * A declined charge is a legitimate outcome, not a system failure, so it is
 * returned rather than thrown. Exceptions stay reserved for infrastructure faults.
 */
export type ChargeResult =
  | { status: 'approved'; reference: string }
  | { status: 'declined'; reason: string }

export interface ChargeRequest {
  /** Amount in integer cents. Money never travels as a float. */
  amountInCents: number
  idempotencyKey: string
}

export interface PaymentProvider {
  charge(request: ChargeRequest): Promise<ChargeResult>
}
