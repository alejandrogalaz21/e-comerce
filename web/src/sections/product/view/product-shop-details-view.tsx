import type { IProductItem } from 'src/types/product';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CategoryIcon } from 'src/components/logo/CategoryIcons';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { CartIcon } from '../components/cart-icon';
import { useCheckoutContext } from '../../checkout/context';
import { ProductDetailsSkeleton } from '../product-skeleton';
import { ProductDetailsSummary } from '../product-details-summary';

type Props = {
  product?: IProductItem;
  error?: unknown;
  loading?: boolean;
};

export function ProductShopDetailsView({ product, error, loading }: Props) {
  const checkout = useCheckoutContext();

  if (loading) {
    return (
      <Container sx={{ mt: 5, mb: 10 }}>
        <ProductDetailsSkeleton />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 5, mb: 10 }}>
        <EmptyContent
          filled
          title="Product not found!"
          action={
            <Button
              component={RouterLink}
              href={paths.product.root}
              startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to list
            </Button>
          }
          sx={{ py: 10 }}
        />
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 5, mb: 10 }}>
      <CartIcon totalItems={checkout.totalItems} />

      <CustomBreadcrumbs
        links={[
          { name: 'Home', href: '/' },
          { name: 'Shop', href: paths.product.root },
          { name: product?.name },
        ]}
        sx={{ mb: 5 }}
      />

      <Grid container spacing={{ xs: 3, md: 5, lg: 8 }}>
        <Grid xs={12} md={6} lg={7}>
          {/* The catalog carries no photos: the category icon is the product's
              face, the same one the gallery and the cart show. */}
          <Box
            sx={{
              display: 'flex',
              aspectRatio: '1/1',
              borderRadius: 2,
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'background.neutral',
            }}
          >
            <CategoryIcon category={product?.category} size={220} />
          </Box>
        </Grid>

        <Grid xs={12} md={6} lg={5}>
          {product && (
            <ProductDetailsSummary
              product={product}
              items={checkout.items}
              onAddCart={checkout.onAddToCart}
              onGotoStep={checkout.onGotoStep}
              disableActions={!product.stock}
            />
          )}
        </Grid>
      </Grid>

      {!!product?.description && (
        <Card sx={{ mt: 10, p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Description
          </Typography>

          <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>
            {product.description}
          </Typography>
        </Card>
      )}
    </Container>
  );
}
