import { useEffect } from 'react';

import Container from '@mui/material/Container';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';

import { downloadReceipt } from 'src/sections/purchase/receipt';

import { CheckoutCart } from '../checkout-cart';
import { useCheckoutContext } from '../context';
import { CheckoutPayment } from '../checkout-payment';
import { CheckoutSteps, CHECKOUT_STEPS } from '../checkout-steps';
import { CheckoutOrderComplete } from '../checkout-order-complete';
import { CheckoutBillingAddress } from '../checkout-billing-address';

export function CheckoutView() {
  const checkout = useCheckoutContext();

  useEffect(() => {
    checkout.initialStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Container sx={{ mb: 10 }}>
      <Typography variant="h4" sx={{ my: { xs: 3, md: 5 } }}>
        Checkout
      </Typography>

      <Grid container justifyContent={checkout.completed ? 'center' : 'flex-start'}>
        <Grid xs={12} md={8}>
          <CheckoutSteps activeStep={checkout.activeStep} steps={CHECKOUT_STEPS} />
        </Grid>
      </Grid>

      <>
        {checkout.activeStep === 0 && <CheckoutCart />}

        {checkout.activeStep === 1 && <CheckoutBillingAddress />}

        {checkout.activeStep === 2 && <CheckoutPayment />}

        {checkout.completed && (
          <CheckoutOrderComplete
            open
            purchase={checkout.purchase}
            onReset={checkout.onReset}
            onDownloadPDF={() => {
              if (checkout.purchase) downloadReceipt(checkout.purchase);
            }}
          />
        )}
      </>
    </Container>
  );
}
