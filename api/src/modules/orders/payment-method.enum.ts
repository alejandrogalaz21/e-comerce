/**
 * How the buyer chose to pay. The simulated provider charges every method the
 * same way, but the order records which one was picked: a receipt that cannot
 * say how it was paid is not much of a receipt.
 */
export enum PaymentMethod {
  CARD = 'card',
  PAYPAL = 'paypal'
}
