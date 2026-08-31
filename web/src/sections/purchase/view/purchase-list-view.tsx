import type { GridColDef } from '@mui/x-data-grid';
import type { IPurchase } from 'src/types/purchase';

import { useMemo, useCallback } from 'react';

import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import { DataGrid, gridClasses } from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { countItems } from '../purchase-utils';
import { useGetPurchases } from '../hooks/use-purchase';
import { usePurchaseParams } from '../hooks/use-purchase-params';
import { toPurchaseQuery, hasPurchaseFilters } from '../purchase-params';
import { PurchaseId, PurchaseStatusLabel, PurchaseTableToolbar } from '../components';

// ----------------------------------------------------------------------

export function PurchaseListView() {
  const router = useRouter();

  const { state, apply, reset } = usePurchaseParams();

  const {
    purchases,
    pagination,
    purchasesLoading,
    purchasesError,
    purchasesEmpty,
    refetchPurchases,
  } = useGetPurchases(toPurchaseQuery(state));

  const filtered = hasPurchaseFilters(state);

  const handlePaginationModelChange = useCallback(
    (model: { page: number; pageSize: number }) =>
      apply({ page: model.page + 1, limit: model.pageSize }),
    [apply]
  );

  const columns: GridColDef<IPurchase>[] = useMemo(
    () => [
      {
        field: 'id',
        headerName: 'Order',
        flex: 1,
        minWidth: 130,
        sortable: false,
        renderCell: (params) => <PurchaseId id={params.row.id} />,
      },
      {
        field: 'createdAt',
        headerName: 'Date',
        width: 170,
        sortable: false,
        valueFormatter: (value: string) => fDateTime(value),
      },
      {
        field: 'items',
        headerName: 'Items',
        width: 80,
        sortable: false,
        align: 'center',
        headerAlign: 'center',
        valueGetter: (_value, row) => countItems(row),
      },
      {
        field: 'total',
        headerName: 'Total',
        width: 120,
        sortable: false,
        align: 'right',
        headerAlign: 'right',
        valueFormatter: (value: number) => fCurrency(value),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 110,
        sortable: false,
        renderCell: (params) => (
          <PurchaseStatusLabel
            status={params.row.status}
            declineReason={params.row.declineReason}
          />
        ),
      },
      {
        field: 'actions',
        headerName: ' ',
        width: 56,
        sortable: false,
        align: 'right',
        renderCell: (params) => (
          <Tooltip title="View order">
            <IconButton component={RouterLink} href={paths.dashboard.order.details(params.row.id)}>
              <Iconify icon="solar:eye-bold" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    []
  );

  const toolbar = (
    <PurchaseTableToolbar
      state={state}
      totalResults={pagination?.total ?? 0}
      onApply={apply}
      onReset={reset}
    />
  );

  // An empty catalog of orders and a search that matched nothing need opposite
  // actions: one has nothing to look at, the other has a criterion to drop.
  const renderEmpty = filtered ? (
    <EmptyContent
      filled
      title="No orders match these filters"
      description="Try a different search, or clear what is filtering the list."
      action={
        <Button
          variant="outlined"
          sx={{ mt: 3 }}
          onClick={reset}
          startIcon={<Iconify icon="mingcute:close-line" />}
        >
          Clear filters
        </Button>
      }
      sx={{ py: 10 }}
    />
  ) : (
    <EmptyContent
      filled
      title="No orders yet"
      description="Orders appear here as soon as a purchase is placed in the shop."
      action={
        <Button
          component={RouterLink}
          href={paths.product.root}
          variant="contained"
          sx={{ mt: 3 }}
          startIcon={<Iconify icon="solar:cart-3-bold" />}
        >
          Go to the shop
        </Button>
      }
      sx={{ py: 10 }}
    />
  );

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading="Orders"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Orders' }]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {purchasesError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetchPurchases()}>
              Retry
            </Button>
          }
        >
          The orders could not be loaded.
        </Alert>
      ) : (
        <Card sx={{ display: 'flex', flexDirection: 'column' }}>
          {toolbar}

          <Divider />

          {purchasesEmpty ? (
            renderEmpty
          ) : (
            <DataGrid
              disableRowSelectionOnClick
              disableColumnMenu
              onRowClick={(params) =>
                router.push(paths.dashboard.order.details(String(params.id)))
              }
              rows={purchases}
              columns={columns}
              loading={purchasesLoading}
              pageSizeOptions={[10, 20, 50]}
              paginationMode="server"
              rowCount={pagination?.total ?? 0}
              paginationModel={{ page: state.page - 1, pageSize: state.limit }}
              onPaginationModelChange={handlePaginationModelChange}
              sx={{
                maxHeight: 'calc(100vh - 300px)',
                [`& .${gridClasses.row}`]: { cursor: 'pointer' },
                [`& .${gridClasses.cell}`]: { alignItems: 'center', display: 'inline-flex' },
              }}
            />
          )}
        </Card>
      )}
    </DashboardContent>
  );
}
