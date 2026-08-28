import type { IProductSortField } from 'src/types/product';
import type {
  GridColDef,
  GridSortModel,
  GridPaginationModel,
  GridRowSelectionModel,
} from '@mui/x-data-grid';

import { useState, useEffect, useCallback } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import {
  DataGrid,
  gridClasses,
  GridActionsCellItem,
  GridToolbarContainer,
  GridToolbarColumnsButton,
} from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useBoolean } from 'src/hooks/use-boolean';
import { useDebounce } from 'src/hooks/use-debounce';

import { fCurrency } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useProductListParams } from '../hooks/use-product-list-params';
import { ProductFiltersToolbar } from '../components/product-filters-toolbar';
import { DEFAULT_SORT_BY, DEFAULT_SORT_DIR, toProductListParams } from '../product-list-params';
import { useGetProducts, useDeleteProduct, useGetProductCategories } from '../hooks/use-product';
import {
  RenderCellStock,
  RenderCellProduct,
  RenderCellCreatedAt,
  RenderCellUpdatedAt,
} from '../product-table-row';

// ----------------------------------------------------------------------

export function ProductListView() {
  const confirmRows = useBoolean();

  const router = useRouter();

  const { state, apply, reset } = useProductListParams();

  const [searchTerm, setSearchTerm] = useState(state.q);

  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  useEffect(() => {
    setSearchTerm(state.q);
  }, [state.q]);

  useEffect(() => {
    if (debouncedSearchTerm !== state.q) {
      apply({ q: debouncedSearchTerm }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);

  const { products, pagination, productsLoading, productsValidating } = useGetProducts(
    toProductListParams(state)
  );

  const { categories } = useGetProductCategories();

  const deleteProduct = useDeleteProduct();

  const [selectedRowIds, setSelectedRowIds] = useState<GridRowSelectionModel>([]);

  const [targetIds, setTargetIds] = useState<string[]>([]);

  const handleOpenConfirm = useCallback(
    (ids: string[]) => {
      setTargetIds(ids);
      confirmRows.onTrue();
    },
    [confirmRows]
  );

  const handleDeleteRows = useCallback(async () => {
    confirmRows.onFalse();
    await Promise.all(targetIds.map((id) => deleteProduct.mutateAsync(id).catch(() => {})));
    setSelectedRowIds([]);
  }, [confirmRows, deleteProduct, targetIds]);

  const handleEditRow = useCallback(
    (id: string) => {
      router.push(paths.dashboard.product.edit(id));
    },
    [router]
  );

  const handleViewRow = useCallback(
    (id: string) => {
      router.push(paths.dashboard.product.details(id));
    },
    [router]
  );

  const handleOpenConfirmDeleteRows = useCallback(
    () => handleOpenConfirm(selectedRowIds.map(String)),
    [handleOpenConfirm, selectedRowIds]
  );

  const handlePaginationModelChange = useCallback(
    (model: GridPaginationModel) => {
      apply({ page: model.page + 1, limit: model.pageSize });
    },
    [apply]
  );

  const handleSortModelChange = useCallback(
    (model: GridSortModel) => {
      const [next] = model;

      if (!next || !next.sort) {
        apply({ sortBy: DEFAULT_SORT_BY, sortDir: DEFAULT_SORT_DIR });
        return;
      }

      apply({ sortBy: next.field as IProductSortField, sortDir: next.sort });
    },
    [apply]
  );

  const columns: GridColDef[] = [
    { field: 'sku', headerName: 'SKU', width: 140, sortable: false },
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 240,
      hideable: false,
      renderCell: (params) => (
        <RenderCellProduct params={params} onViewRow={() => handleViewRow(params.row.id)} />
      ),
    },
    { field: 'category', headerName: 'Category', width: 160, sortable: false },
    {
      field: 'price',
      headerName: 'Price',
      width: 120,
      valueFormatter: (value: number) => fCurrency(value),
    },
    {
      field: 'stock',
      headerName: 'Stock',
      width: 100,
      renderCell: (params) => <RenderCellStock params={params} />,
    },
    {
      field: 'weightKg',
      headerName: 'Weight (kg)',
      width: 120,
      sortable: false,
      valueFormatter: (value: number | null) => (value == null ? '-' : value),
    },
    {
      field: 'createdAt',
      headerName: 'Created at',
      width: 160,
      renderCell: (params) => <RenderCellCreatedAt params={params} />,
    },
    {
      field: 'updatedAt',
      headerName: 'Updated at',
      width: 160,
      renderCell: (params) => <RenderCellUpdatedAt params={params} />,
    },
    {
      type: 'actions',
      field: 'actions',
      headerName: ' ',
      align: 'right',
      headerAlign: 'right',
      width: 80,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      getActions: (params) => [
        <GridActionsCellItem
          showInMenu
          icon={<Iconify icon="solar:eye-bold" />}
          label="View"
          onClick={() => handleViewRow(params.row.id)}
        />,
        <GridActionsCellItem
          showInMenu
          icon={<Iconify icon="solar:pen-bold" />}
          label="Edit"
          onClick={() => handleEditRow(params.row.id)}
        />,
        <GridActionsCellItem
          showInMenu
          icon={<Iconify icon="solar:trash-bin-trash-bold" />}
          label="Delete"
          onClick={() => handleOpenConfirm([params.row.id])}
          sx={{ color: 'error.main' }}
        />,
      ],
    },
  ];

  const totalResults = pagination?.total ?? 0;

  const hasActiveFilters =
    !!state.q ||
    !!state.category.length ||
    state.minPrice !== undefined ||
    state.maxPrice !== undefined ||
    state.inStock !== undefined;

  return (
    <>
      <DashboardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <CustomBreadcrumbs
          heading="List"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Product', href: paths.dashboard.product.root },
            { name: 'List' },
          ]}
          action={
            <Stack direction="row" spacing={1.5}>
              <Button
                component={RouterLink}
                href={paths.dashboard.product.import}
                variant="outlined"
                startIcon={<Iconify icon="eva:cloud-upload-fill" />}
              >
                Import CSV
              </Button>

              <Button
                component={RouterLink}
                href={paths.dashboard.product.new}
                variant="contained"
                startIcon={<Iconify icon="mingcute:add-line" />}
              >
                New product
              </Button>
            </Stack>
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card
          sx={{
            flexGrow: { md: 1 },
            display: { md: 'flex' },
            height: { xs: 800, md: 2 },
            flexDirection: { md: 'column' },
          }}
        >
          <ProductFiltersToolbar
            state={state}
            categories={categories}
            totalResults={totalResults}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onApply={apply}
            onReset={reset}
          />

          <Divider />

          <DataGrid
            checkboxSelection
            disableRowSelectionOnClick
            rows={products}
            columns={columns}
            loading={productsLoading || productsValidating}
            pageSizeOptions={[5, 10, 25]}
            paginationMode="server"
            sortingMode="server"
            rowCount={totalResults}
            paginationModel={{ page: state.page - 1, pageSize: state.limit }}
            sortModel={[{ field: state.sortBy, sort: state.sortDir }]}
            onPaginationModelChange={handlePaginationModelChange}
            onSortModelChange={handleSortModelChange}
            onRowSelectionModelChange={(newSelectionModel) => setSelectedRowIds(newSelectionModel)}
            slots={{
              toolbar: CustomToolbar,
              noRowsOverlay: () => {
                if (state.q) {
                  return <EmptyContent title={`No results found for "${state.q}"`} />;
                }
                return hasActiveFilters ? (
                  <EmptyContent title="No products match these filters" />
                ) : (
                  <EmptyContent title="No products yet" />
                );
              },
              noResultsOverlay: () => <EmptyContent title="No results found" />,
            }}
            slotProps={{
              toolbar: {
                selectedRowIds,
                onOpenConfirmDeleteRows: handleOpenConfirmDeleteRows,
              },
            }}
            sx={{ [`& .${gridClasses.cell}`]: { alignItems: 'center', display: 'inline-flex' } }}
          />
        </Card>
      </DashboardContent>

      <ConfirmDialog
        open={confirmRows.value}
        onClose={confirmRows.onFalse}
        title="Delete"
        content={
          <>
            Are you sure want to delete <strong> {targetIds.length} </strong>{' '}
            {targetIds.length === 1 ? 'item' : 'items'}?
          </>
        }
        action={
          <Button variant="contained" color="error" onClick={handleDeleteRows}>
            Delete
          </Button>
        }
      />
    </>
  );
}

// ----------------------------------------------------------------------

type CustomToolbarProps = {
  selectedRowIds: GridRowSelectionModel;
  onOpenConfirmDeleteRows: () => void;
};

declare module '@mui/x-data-grid' {
  interface ToolbarPropsOverrides extends CustomToolbarProps {}
}

function CustomToolbar({ selectedRowIds, onOpenConfirmDeleteRows }: CustomToolbarProps) {
  return (
    <GridToolbarContainer>
      <Stack spacing={1} flexGrow={1} direction="row" alignItems="center" justifyContent="flex-end">
        {!!selectedRowIds.length && (
          <Button
            size="small"
            color="error"
            sx={{ mr: 'auto' }}
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
            onClick={onOpenConfirmDeleteRows}
          >
            Delete ({selectedRowIds.length})
          </Button>
        )}

        <GridToolbarColumnsButton />
      </Stack>
    </GridToolbarContainer>
  );
}
