// src/modules/orders/entities/order.entity.ts
/**
 * Order entity model used for DynamoDB persistence.
 * This is a plain TypeScript class (not a TypeORM entity) describing
 * the shape of an Order item stored in the `orders` DynamoDB table.
 */
export class Order {
  /** Primary identifier (partition key) */
  orderId: string
  /** Identifier of the customer placing the order */
  customerId: string
  /** Current status of the order */
  status: OrderStatus
  /** Line items included in the order */
  items: OrderItem[]
  /** Monetary total for the order */
  total: number
  /** Currency code in ISO 4217 (e.g. 'USD') */
  currency: string
  /** Optional notes or special instructions */
  notes?: string
  /** ISO timestamp when the order was created */
  createdAt: string
  /** ISO timestamp when the order was last updated */
  updatedAt: string
}

/** Supported order lifecycle statuses */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

/** Structure of a line item inside an order */
export interface OrderItem {
  /** Product identifier */
  productId: string
  /** Quantity ordered */
  quantity: number
  /** Unit price at time of ordering */
  unitPrice: number
  /** Optional readable product name snapshot */
  title?: string
}
