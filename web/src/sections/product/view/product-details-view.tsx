import type { IProductItem } from 'src/types/product';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CategoryIcon } from 'src/components/logo/CategoryIcons';

import { ProductDetailsSkeleton } from '../product-skeleton';
import { ProductDetailsSummary } from '../product-details-summary';
import { ProductDetailsToolbar } from '../product-details-toolbar';

type Props = {
  product?: IProductItem;
  loading?: boolean;
  error?: unknown;
};

export function ProductDetailsView({ product, error, loading }: Props) {
  if (loading) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <ProductDetailsSkeleton />
      </DashboardContent>
    );
  }

  if (error) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Product not found!"
          action={
            <Button
              component={RouterLink}
              href={paths.dashboard.product.root}
              startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to list
            </Button>
          }
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <ProductDetailsToolbar
        backLink={paths.dashboard.product.root}
        editLink={paths.dashboard.product.edit(`${product?.id}`)}
        liveLink={paths.product.details(`${product?.id}`)}
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
          {product && <ProductDetailsSummary disableActions product={product} />}
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
    </DashboardContent>
  );
}
