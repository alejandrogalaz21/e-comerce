import type { IPurchase } from 'src/types/purchase';
import type { IAddressItem } from 'src/types/common';
import type { ICheckoutItem, ICheckoutState, CheckoutContextValue } from 'src/types/checkout';

import { useMemo, Suspense, useEffect, useCallback, createContext } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { getStorage, useLocalStorage } from 'src/hooks/use-local-storage';

import { uuidv4 } from 'src/utils/uuidv4';

import { SplashScreen } from 'src/components/loading-screen';

import { CHECKOUT_STEPS } from '../checkout-steps';
import { keepOrMintKey, shouldMintKey } from '../idempotency-key';
import { isPurchasable, hasCartDifference, clearCartDifferences } from '../cart-reconcile';

export const CheckoutContext = createContext<CheckoutContextValue | undefined>(undefined);

export const CheckoutConsumer = CheckoutContext.Consumer;

const STORAGE_KEY = 'app-checkout';

const initialState: ICheckoutState = {
  items: [],
  subtotal: 0,
  total: 0,
  billing: null,
  totalItems: 0,
  idempotencyKey: '',
  purchase: null,
};

type Props = {
  children: React.ReactNode;
};

export function CheckoutProvider({ children }: Props) {
  return (
    <Suspense fallback={<SplashScreen />}>
      <Container>{children}</Container>
    </Suspense>
  );
}

function Container({ children }: Props) {
  const router = useRouter();

  const searchParams = useSearchParams();

  const activeStep = Number(searchParams.get('step'));

  const { state, setState, setField, canReset, resetState } = useLocalStorage<ICheckoutState>(
    STORAGE_KEY,
    initialState
  );

  const completed = activeStep === CHECKOUT_STEPS.length;

  const updateTotalField = useCallback(() => {
    const buyable = state.items.filter(isPurchasable);

    const totalItems: number = buyable.reduce(
      (total: number, item: ICheckoutItem) => total + item.quantity,
      0
    );

    const subtotal: number = buyable.reduce(
      (total: number, item: ICheckoutItem) => total + item.quantity * item.price,
      0
    );

    setField('subtotal', subtotal);
    setField('totalItems', totalItems);
    setField('total', subtotal);
  }, [setField, state.items]);

  useEffect(() => {
    const restoredValue = getStorage(STORAGE_KEY);
    if (restoredValue) {
      updateTotalField();
    }
  }, [updateTotalField]);

  const initialStep = useCallback(() => {
    if (!activeStep) {
      const href = createUrl('go', 0);
      router.push(href);
    }
  }, [activeStep, router]);

  useEffect(() => {
    if (shouldMintKey(state.items.length, state.idempotencyKey)) {
      setField('idempotencyKey', keepOrMintKey(state.idempotencyKey));
    }
  }, [setField, state.items.length, state.idempotencyKey]);

  const onPurchasePlaced = useCallback(
    (purchase: IPurchase) => {
      setField('purchase', purchase);
    },
    [setField]
  );

  const onRenewIdempotencyKey = useCallback(() => {
    setField('idempotencyKey', uuidv4());
  }, [setField]);

  const onBackStep = useCallback(() => {
    const href = createUrl('back', activeStep);
    router.push(href);
  }, [activeStep, router]);

  const onNextStep = useCallback(() => {
    const href = createUrl('next', activeStep);
    router.push(href);
  }, [activeStep, router]);

  const onGotoStep = useCallback(
    (step: number) => {
      const href = createUrl('go', step);
      router.push(href);
    },
    [router]
  );

  const onAddToCart = useCallback(
    (newItem: ICheckoutItem) => {
      const updatedItems: ICheckoutItem[] = state.items.map((item: ICheckoutItem) => {
        if (item.id === newItem.id) {
          return { ...item, quantity: item.quantity + newItem.quantity };
        }
        return item;
      });

      if (!updatedItems.some((item: ICheckoutItem) => item.id === newItem.id)) {
        updatedItems.push(newItem);
      }

      setField('items', updatedItems);
    },
    [setField, state.items]
  );

  const onDeleteCart = useCallback(
    (itemId: string) => {
      const updatedItems = state.items.filter((item: ICheckoutItem) => item.id !== itemId);

      setField('items', updatedItems);
    },
    [setField, state.items]
  );

  const onIncreaseQuantity = useCallback(
    (itemId: string) => {
      const updatedItems = state.items.map((item: ICheckoutItem) => {
        if (item.id === itemId) {
          return { ...item, quantity: item.quantity + 1 };
        }
        return item;
      });

      setField('items', updatedItems);
    },
    [setField, state.items]
  );

  const onDecreaseQuantity = useCallback(
    (itemId: string) => {
      const updatedItems = state.items.map((item: ICheckoutItem) => {
        if (item.id === itemId) {
          return { ...item, quantity: item.quantity - 1 };
        }
        return item;
      });

      setField('items', updatedItems);
    },
    [setField, state.items]
  );

  const onEmptyCart = useCallback(() => {
    setState({ items: [], idempotencyKey: '' });
  }, [setState]);

  const onClearCartChanges = useCallback(() => {
    if (!state.items.some(hasCartDifference)) return;

    setField('items', clearCartDifferences(state.items));
  }, [setField, state.items]);

  const onCreateBilling = useCallback(
    (address: IAddressItem) => {
      setField('billing', address);

      onNextStep();
    },
    [onNextStep, setField]
  );

  const onReset = useCallback(() => {
    if (completed) {
      resetState();
      router.push(paths.product.root);
    }
  }, [completed, resetState, router]);

  const memoizedValue = useMemo(
    () => ({
      ...state,
      canReset,
      onReset,
      onUpdate: setState,
      onUpdateField: setField,
      completed,
      onAddToCart,
      onDeleteCart,
      onIncreaseQuantity,
      onDecreaseQuantity,
      onEmptyCart,
      onClearCartChanges,
      onCreateBilling,
      onPurchasePlaced,
      onRenewIdempotencyKey,
      activeStep,
      initialStep,
      onBackStep,
      onNextStep,
      onGotoStep,
    }),
    [
      state,
      onPurchasePlaced,
      onRenewIdempotencyKey,
      onReset,
      canReset,
      setField,
      completed,
      setState,
      activeStep,
      onBackStep,
      onGotoStep,
      onNextStep,
      initialStep,
      onAddToCart,
      onDeleteCart,
      onCreateBilling,
      onDecreaseQuantity,
      onIncreaseQuantity,
      onEmptyCart,
      onClearCartChanges,
    ]
  );

  return <CheckoutContext.Provider value={memoizedValue}>{children}</CheckoutContext.Provider>;
}

function createUrl(type: 'back' | 'next' | 'go', activeStep: number) {
  const step = { back: activeStep - 1, next: activeStep + 1, go: activeStep }[type];

  const stepParams = new URLSearchParams({ step: `${step}` }).toString();

  return `${paths.product.checkout}?${stepParams}`;
}
