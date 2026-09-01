import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { useCheckoutContext } from './context';
import { isPurchasable } from './cart-reconcile';
import { CheckoutSummary } from './checkout-summary';
import { CartChangeNotice } from './cart-change-notice';
import { useCartRevalidation } from './hooks/use-cart-revalidation';
import { CheckoutCartProductList } from './checkout-cart-product-list';

export function CheckoutCart() {
  const checkout = useCheckoutContext();

  // The catalog may have moved while the cart waited, and this is the last place
  // the visitor reads prices before committing to them.
  const { unverified } = useCartRevalidation();

  const empty = !checkout.items.length;

  const blocked = checkout.items.some((item) => !isPurchasable(item));

  const handleContinue = () => {
    checkout.onClearCartChanges();
    checkout.onNextStep();
  };

  return (
    <Grid container spacing={3}>
      <Grid xs={12} md={8}>
        <CartChangeNotice items={checkout.items} unverified={unverified} />

        <Card sx={{ mb: 3 }}>
          <CardHeader
            title={
              <Typography variant="h6">
                Cart
                <Typography component="span" sx={{ color: 'text.secondary' }}>
                  &nbsp;(
                  {checkout.totalItems} item)
                </Typography>
              </Typography>
            }
            sx={{ mb: 3 }}
          />

          {empty ? (
            <EmptyContent
              title="Cart is empty!"
              description="Look like you have no items in your shopping cart."
              imgUrl={`${CONFIG.site.basePath}/assets/icons/empty/ic-cart.svg`}
              sx={{ pt: 5, pb: 10 }}
            />
          ) : (
            <CheckoutCartProductList
              products={checkout.items}
              onDelete={checkout.onDeleteCart}
              onIncreaseQuantity={checkout.onIncreaseQuantity}
              onDecreaseQuantity={checkout.onDecreaseQuantity}
            />
          )}
        </Card>

        <Button
          component={RouterLink}
          href={paths.product.root}
          color="inherit"
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
        >
          Continue shopping
        </Button>
      </Grid>

      <Grid xs={12} md={4}>
        <CheckoutSummary total={checkout.total} subtotal={checkout.subtotal} />

        <Button
          fullWidth
          size="large"
          type="submit"
          variant="contained"
          disabled={empty || blocked}
          onClick={handleContinue}
        >
          Check out
        </Button>
      </Grid>
    </Grid>
  );
}
