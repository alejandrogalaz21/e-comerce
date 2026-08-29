import type { PlacePurchaseError } from 'src/actions/purchase';
import type {
  ICheckoutCardOption,
  ICheckoutPaymentOption,
  ICheckoutDeliveryOption,
} from 'src/types/checkout';

import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import AlertTitle from '@mui/material/AlertTitle';
import LoadingButton from '@mui/lab/LoadingButton';

import { Form } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';

import { usePlacePurchase } from 'src/sections/purchase/hooks/use-purchase';

import { useCheckoutContext } from './context';
import { CheckoutSummary } from './checkout-summary';
import { CheckoutDelivery } from './checkout-delivery';
import { CheckoutBillingInfo } from './checkout-billing-info';
import { CheckoutPaymentMethods } from './checkout-payment-methods';

// ----------------------------------------------------------------------

const DELIVERY_OPTIONS: ICheckoutDeliveryOption[] = [
  { value: 0, label: 'Free', description: '5-7 days delivery' },
  { value: 10, label: 'Standard', description: '3-5 days delivery' },
  { value: 20, label: 'Express', description: '2-3 days delivery' },
];

const PAYMENT_OPTIONS: ICheckoutPaymentOption[] = [
  {
    value: 'paypal',
    label: 'Pay with Paypal',
    description: 'You will be redirected to PayPal website to complete your purchase securely.',
  },
  {
    value: 'credit',
    label: 'Credit / Debit card',
    description: 'We support Mastercard, Visa, Discover and Stripe.',
  },
  { value: 'cash', label: 'Cash', description: 'Pay with cash when your order is delivered.' },
];

const CARDS_OPTIONS: ICheckoutCardOption[] = [
  { value: 'ViSa1', label: '**** **** **** 1212 - Jimmy Holland' },
  { value: 'ViSa2', label: '**** **** **** 2424 - Shawn Stokes' },
  { value: 'MasterCard', label: '**** **** **** 4545 - Cole Armstrong' },
];

// ----------------------------------------------------------------------

export type PaymentSchemaType = zod.infer<typeof PaymentSchema>;

export const PaymentSchema = zod.object({
  payment: zod.string().min(1, { message: 'Payment is required!' }),
  // Not required
  delivery: zod.number(),
});

// ----------------------------------------------------------------------

export function CheckoutPayment() {
  const checkout = useCheckoutContext();

  const placePurchase = usePlacePurchase();

  const [failure, setFailure] = useState<PlacePurchaseError | null>(null);

  const defaultValues = { delivery: checkout.shipping, payment: '' };

  const methods = useForm<PaymentSchemaType>({
    resolver: zodResolver(PaymentSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async () => {
    setFailure(null);

    try {
      const purchase = await placePurchase.mutateAsync({
        items: checkout.items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        idempotencyKey: checkout.idempotencyKey,
      });

      checkout.onPurchasePlaced(purchase);
      checkout.onNextStep();
    } catch (error) {
      const placeError = error as PlacePurchaseError;
      setFailure(placeError);

      // A declined charge closes that key: the API replays the same decline for
      // it, so a retry has to be a new attempt.
      if (placeError.kind === 'payment') {
        checkout.onRenewIdempotencyKey();
      }
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          {failure && <PurchaseFailure failure={failure} onEditCart={() => checkout.onGotoStep(0)} />}

          <CheckoutDelivery onApplyShipping={checkout.onApplyShipping} options={DELIVERY_OPTIONS} />

          <CheckoutPaymentMethods
            options={{
              payments: PAYMENT_OPTIONS,
              cards: CARDS_OPTIONS,
            }}
            sx={{ my: 3 }}
          />

          <Button
            size="small"
            color="inherit"
            onClick={checkout.onBackStep}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          >
            Back
          </Button>
        </Grid>

        <Grid xs={12} md={4}>
          <CheckoutBillingInfo billing={checkout.billing} onBackStep={checkout.onBackStep} />

          <CheckoutSummary
            total={checkout.total}
            subtotal={checkout.subtotal}
            discount={checkout.discount}
            shipping={checkout.shipping}
            onEdit={() => checkout.onGotoStep(0)}
          />

          <LoadingButton
            fullWidth
            size="large"
            type="submit"
            variant="contained"
            loading={isSubmitting || placePurchase.isPending}
            disabled={isSubmitting || placePurchase.isPending || !checkout.items.length}
          >
            Complete order
          </LoadingButton>
        </Grid>
      </Grid>
    </Form>
  );
}

// ----------------------------------------------------------------------

type FailureProps = {
  failure: PlacePurchaseError;
  onEditCart: () => void;
};

/**
 * Three outcomes that need three answers: fix the cart, try the charge again,
 * or try the request again. A single generic error would hide which one applies.
 */
function PurchaseFailure({ failure, onEditCart }: FailureProps) {
  if (failure.kind === 'stock') {
    const { conflict } = failure;

    return (
      <Alert
        severity="warning"
        sx={{ mb: 3 }}
        action={
          <Button color="inherit" size="small" onClick={onEditCart}>
            Edit cart
          </Button>
        }
      >
        <AlertTitle>Not enough stock</AlertTitle>
        {conflict?.sku
          ? `${conflict.sku}: you asked for ${conflict.requested} and only ${conflict.available} are left. Adjust the quantity to continue.`
          : failure.message}
      </Alert>
    );
  }

  if (failure.kind === 'payment') {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <AlertTitle>Payment declined</AlertTitle>
        {failure.message}. Nothing was charged and your cart is untouched — you can try again.
      </Alert>
    );
  }

  return (
    <Alert severity="error" sx={{ mb: 3 }}>
      <AlertTitle>The order could not be placed</AlertTitle>
      {failure.message}
    </Alert>
  );
}
