import type { IPaymentMethod } from 'src/types/purchase';
import type { PlacePurchaseError } from 'src/actions/purchase';
import type { ICheckoutPaymentOption } from 'src/types/checkout';

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
import { isPurchasable } from './cart-reconcile';
import { CheckoutSummary } from './checkout-summary';
import { CartChangeNotice } from './cart-change-notice';
import { CheckoutBillingInfo } from './checkout-billing-info';
import { useCartRevalidation } from './hooks/use-cart-revalidation';
import { CheckoutPaymentMethods } from './checkout-payment-methods';

const PAYMENT_OPTIONS: ICheckoutPaymentOption[] = [
  {
    value: 'paypal',
    label: 'Pay with Paypal',
    description: 'You will be redirected to PayPal website to complete your purchase securely.',
  },
  {
    value: 'card',
    label: 'Credit / Debit card',
    description: 'We support Mastercard, Visa, Discover and Stripe.',
  },
];

export type PaymentSchemaType = zod.infer<typeof PaymentSchema>;

export const PaymentSchema = zod.object({
  payment: zod.enum(['card', 'paypal'], { required_error: 'Payment is required!' }),
});

export function CheckoutPayment() {
  const checkout = useCheckoutContext();

  const placePurchase = usePlacePurchase();

  const { unverified } = useCartRevalidation();

  const [failure, setFailure] = useState<PlacePurchaseError | null>(null);

  const blocked = checkout.items.some((item) => !isPurchasable(item));

  const defaultValues = { payment: undefined };

  const methods = useForm<PaymentSchemaType>({
    resolver: zodResolver(PaymentSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    setFailure(null);

    const { billing } = checkout;

    if (!billing) {
      checkout.onGotoStep(1);
      return;
    }

    try {
      const purchase = await placePurchase.mutateAsync({
        items: checkout.items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        idempotencyKey: checkout.idempotencyKey,
        paymentMethod: data.payment as IPaymentMethod,
        shippingAddress: {
          name: billing.name,
          phone: billing.phoneNumber ?? '',
          email: billing.email ?? '',
          address: billing.street ?? billing.fullAddress,
          city: billing.city ?? '',
          state: billing.state ?? '',
          zipCode: billing.zipCode ?? '',
          country: billing.country ?? '',
        },
      });

      checkout.onPurchasePlaced(purchase);
      checkout.onClearCartChanges();
      checkout.onNextStep();
    } catch (error) {
      const placeError = error as PlacePurchaseError;
      setFailure(placeError);

      if (placeError.kind === 'payment') {
        checkout.onRenewIdempotencyKey();
      }
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      {/* The lines take the wide column, which is the one that can grow with them;
          the decision and the button share the narrow one, so what is confirmed
          sits next to how it is paid. */}
      <Grid container spacing={3}>
        <Grid xs={12} md={7}>
          <CartChangeNotice items={checkout.items} unverified={unverified} />

          {failure && (
            <PurchaseFailure
              failure={failure}
              missingName={nameOf(checkout.items, failure.missingProductId)}
              onEditCart={() => checkout.onGotoStep(0)}
            />
          )}

          <CheckoutSummary
            total={checkout.total}
            items={checkout.items}
            subtotal={checkout.subtotal}
            onEdit={() => checkout.onGotoStep(0)}
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

        <Grid xs={12} md={5}>
          <CheckoutBillingInfo billing={checkout.billing} onBackStep={checkout.onBackStep} />

          <CheckoutPaymentMethods options={PAYMENT_OPTIONS} sx={{ mb: 3 }} />

          <LoadingButton
            fullWidth
            size="large"
            type="submit"
            variant="contained"
            loading={isSubmitting || placePurchase.isPending}
            disabled={
              isSubmitting ||
              placePurchase.isPending ||
              !checkout.items.length ||
              !checkout.billing ||
              blocked
            }
          >
            Complete order
          </LoadingButton>
        </Grid>
      </Grid>
    </Form>
  );
}

function nameOf(items: { id: string; name: string }[], productId?: string): string | undefined {
  return items.find((item) => item.id === productId)?.name;
}

type FailureProps = {
  failure: PlacePurchaseError;
  missingName?: string;
  onEditCart: () => void;
};

function PurchaseFailure({ failure, missingName, onEditCart }: FailureProps) {
  if (failure.kind === 'missing') {
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
        <AlertTitle>A product is no longer available</AlertTitle>
        {missingName
          ? `${missingName} was removed from the catalog. Take it out of the cart to continue.`
          : 'One of the products in your cart was removed from the catalog. Take it out to continue.'}
      </Alert>
    );
  }

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
