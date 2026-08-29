import type { IPurchase } from './purchase';
import type { IAddressItem } from './common';

// ----------------------------------------------------------------------

export type ICheckoutItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  coverUrl?: string;
  subtotal?: number;
};

export type ICheckoutDeliveryOption = {
  value: number;
  label: string;
  description: string;
  /** Part of the option: choosing it by comparing the label ties behaviour to UI copy. */
  icon: string;
};

export type ICheckoutPaymentOption = {
  value: string;
  label: string;
  description: string;
};

export type ICheckoutCardOption = {
  value: string;
  label: string;
};

export type ICheckoutState = {
  total: number;
  subtotal: number;
  discount: number;
  shipping: number;
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
  onCreateBilling: (billing: IAddressItem) => void;
  onApplyDiscount: (discount: number) => void;
  onApplyShipping: (discount: number) => void;
  //
  onPurchasePlaced: (purchase: IPurchase) => void;
  /** A declined attempt closes that key. Retrying means a new attempt. */
  onRenewIdempotencyKey: () => void;
};
