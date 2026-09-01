import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { shortId } from '../purchase-utils';
import { useGetPurchase } from '../hooks/use-purchase';
import {
  PurchaseDetailsItems,
  PurchaseDetailsAddress,
  PurchaseDetailsSummary,
  PurchaseDetailsEvidence,
} from '../components';

type Props = {
  id: string;
};

export function PurchaseDetailsView({ id }: Props) {
  const { purchase, purchaseLoading, purchaseError } = useGetPurchase(id);

  if (purchaseLoading) {
    return (
      <DashboardContent maxWidth="xl">
        <LinearProgress sx={{ width: 1, maxWidth: 320, mx: 'auto', mt: 10 }} />
      </DashboardContent>
    );
  }

  if (purchaseError || !purchase) {
    return (
      <DashboardContent maxWidth="xl">
        <EmptyContent
          filled
          title="Order not found"
          description="This order does not exist, or it is no longer available."
          action={
            <Button
              component={RouterLink}
              href={paths.dashboard.order.root}
              variant="contained"
              sx={{ mt: 3 }}
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            >
              Back to orders
            </Button>
          }
          sx={{ py: 10 }}
        />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={`Order ${shortId(purchase.id)}`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Orders', href: paths.dashboard.order.root },
          { name: shortId(purchase.id) },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Stack spacing={3}>
            <PurchaseDetailsItems items={purchase.items} />
            <PurchaseDetailsAddress address={purchase.shippingAddress} />
          </Stack>
        </Grid>

        <Grid xs={12} md={4}>
          <Stack spacing={3}>
            <PurchaseDetailsSummary purchase={purchase} />
            <PurchaseDetailsEvidence purchase={purchase} />
          </Stack>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
