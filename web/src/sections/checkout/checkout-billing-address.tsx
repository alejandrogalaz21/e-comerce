import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';

import { useBoolean } from 'src/hooks/use-boolean';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { useCheckoutContext } from './context';
import { CheckoutSummary } from './checkout-summary';
import { CartChangeNotice } from './cart-change-notice';
import { AddressItem, AddressNewForm } from '../address';
import { useCartRevalidation } from './hooks/use-cart-revalidation';

export function CheckoutBillingAddress() {
  const checkout = useCheckoutContext();

  // Every screen that shows a total shows a reconciled one: this step displays
  // the summary too, so it cannot be the one that skips the check.
  const { unverified } = useCartRevalidation();

  const addressForm = useBoolean();

  const { billing } = checkout;

  return (
    <>
      {/* Same shape as the payment step: what is being bought on the left, what
          this step asks for on the right. */}
      <Grid container spacing={3}>
        <Grid xs={12} md={7}>
          <CartChangeNotice items={checkout.items} unverified={unverified} />

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
          {billing ? (
            <>
              <AddressItem
                address={billing}
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 2,
                  boxShadow: (theme) => theme.customShadows.card,
                }}
              />

              <Stack spacing={1.5}>
                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  onClick={() => checkout.onCreateBilling(billing)}
                >
                  Deliver to this address
                </Button>

                <Button
                  size="small"
                  color="inherit"
                  onClick={addressForm.onTrue}
                  startIcon={<Iconify icon="solar:pen-bold" />}
                >
                  Change address
                </Button>
              </Stack>
            </>
          ) : (
            <Card>
              <EmptyContent
                title="No delivery address yet"
                description="Add where this order should be delivered to continue."
                action={
                  <Button
                    variant="contained"
                    onClick={addressForm.onTrue}
                    sx={{ mt: 3 }}
                    startIcon={<Iconify icon="mingcute:add-line" />}
                  >
                    Add address
                  </Button>
                }
                sx={{ py: 8 }}
              />
            </Card>
          )}
        </Grid>
      </Grid>

      <AddressNewForm
        open={addressForm.value}
        onClose={addressForm.onFalse}
        onCreate={checkout.onCreateBilling}
      />
    </>
  );
}
