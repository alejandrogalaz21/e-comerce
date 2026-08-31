import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';

import { useBoolean } from 'src/hooks/use-boolean';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { useCheckoutContext } from './context';
import { CheckoutSummary } from './checkout-summary';
import { AddressItem, AddressNewForm } from '../address';

// ----------------------------------------------------------------------

export function CheckoutBillingAddress() {
  const checkout = useCheckoutContext();

  const addressForm = useBoolean();

  const { billing } = checkout;

  return (
    <>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          {billing ? (
            <AddressItem
              address={billing}
              action={
                <Button variant="outlined" size="small" onClick={() => checkout.onCreateBilling(billing)}>
                  Deliver to this address
                </Button>
              }
              sx={{
                p: 3,
                mb: 3,
                borderRadius: 2,
                boxShadow: (theme) => theme.customShadows.card,
              }}
            />
          ) : (
            <Card sx={{ mb: 3 }}>
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

          <Stack direction="row" justifyContent="space-between">
            <Button
              size="small"
              color="inherit"
              onClick={checkout.onBackStep}
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            >
              Back
            </Button>

            {billing && (
              <Button
                size="small"
                color="primary"
                onClick={addressForm.onTrue}
                startIcon={<Iconify icon="solar:pen-bold" />}
              >
                Change address
              </Button>
            )}
          </Stack>
        </Grid>

        <Grid xs={12} md={4}>
          <CheckoutSummary total={checkout.total} subtotal={checkout.subtotal} />
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
