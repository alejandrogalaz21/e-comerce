import type { IPurchase } from './purchase';
import type { IAddressItem } from './common';

export type ICheckoutItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  coverUrl?: string;
  subtotal?: number;
  /**
   * A line is identified by an id nobody reads and by a name the catalog can
   * change under it. Optional because carts stored before this existed have none:
   * the first revalidation fills it in.
   */
  sku?: string;
  /** What the line cost when it was added, kept while the difference is worth showing. */
  addedPrice?: number;
  /** What the product was called when it was added. */
  addedName?: string;
  /** The quantity the visitor had chosen before the stock forced it down. */
  adjustedFrom?: number;
  /** The product is no longer in the catalog, so this line cannot be bought. */
  unavailable?: boolean;
};

export type ICheckoutPaymentOption = {
  value: string;
  label: string;
  description: string;
};

export type ICheckoutState = {
  total: number;
  subtotal: number;
  totalItems: number;
  items: ICheckoutItem[];
  billing: IAddressItem | null;
  /**
   * Generated when the checkout starts, not when Confirm is pressed: a key born
   * on the click would be a new key per click, which is what it exists to prevent.
   */
  idempotencyKey: string;
  /** The order the API confirmed, kept so the completion step can show it. */
  purchase: IPurchase | null;
};

export type CheckoutContextValue = ICheckoutState & {
  canReset: boolean;
  onReset: () => void;
  onUpdate: (updateValue: Partial<ICheckoutState>) => void;
  onUpdateField: (
    name: keyof ICheckoutState,
    updateValue: ICheckoutState[keyof ICheckoutState]
  ) => void;
  //
  completed: boolean;
  //
  onAddToCart: (newItem: ICheckoutItem) => void;
  onDeleteCart: (itemId: string) => void;
  //
  onIncreaseQuantity: (itemId: string) => void;
  onDecreaseQuantity: (itemId: string) => void;
  //
  activeStep: number;
  initialStep: () => void;
  onBackStep: () => void;
  onNextStep: () => void;
  onGotoStep: (step: number) => void;
  //
  /** Drops the "this changed" marks once the visitor has seen them and continues. */
  onClearCartChanges: () => void;
  //
  onCreateBilling: (billing: IAddressItem) => void;
  //
  onPurchasePlaced: (purchase: IPurchase) => void;
  /** A declined attempt closes that key. Retrying means a new attempt. */
  onRenewIdempotencyKey: () => void;
};
