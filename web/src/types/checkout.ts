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
  sku?: string;
  category?: string;
  addedPrice?: number;
  addedName?: string;
  adjustedFrom?: number;
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
  idempotencyKey: string;
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
  completed: boolean;
  onAddToCart: (newItem: ICheckoutItem) => void;
  onDeleteCart: (itemId: string) => void;
  onIncreaseQuantity: (itemId: string) => void;
  onDecreaseQuantity: (itemId: string) => void;
  activeStep: number;
  initialStep: () => void;
  onBackStep: () => void;
  onNextStep: () => void;
  onGotoStep: (step: number) => void;
  onEmptyCart: () => void;
  onClearCartChanges: () => void;
  onCreateBilling: (billing: IAddressItem) => void;
  onPurchasePlaced: (purchase: IPurchase) => void;
  onRenewIdempotencyKey: () => void;
};
