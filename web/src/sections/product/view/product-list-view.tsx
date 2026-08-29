import type { IProductCategory, IProductSortField } from 'src/types/product';
import type {
  GridColDef,
  GridSortModel,
  GridPaginationModel,
  GridRowSelectionModel,
} from '@mui/x-data-grid';

import { useState, useCallback } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import {
  DataGrid,
  gridClasses,
  GridActionsCellItem,
  GridToolbarColumnsButton,
} from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useBoolean } from 'src/hooks/use-boolean';

import { fCurrency } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useProductListParams } from '../hooks/use-product-list-params';
import { useProductListColumns } from '../hooks/use-product-list-columns';
import { ProductFiltersToolbar } from '../components/product-filters-toolbar';
import { DEFAULT_SORT_BY, DEFAULT_SORT_DIR, toProductListParams } from '../product-list-params';
import { useGetProducts, useDeleteProduct, useGetProductCategories } from '../hooks/use-product';
import {
  RenderCellStock,
  RenderCellProduct,
  RenderCellCreatedAt,
  RenderCellUpdatedAt,
  RenderCellDescription,
} from '../product-table-row';

import type { IProductListState } from '../product-list-params';

// ----------------------------------------------------------------------

export function ProductListView() {
  const confirmRows = useBoolean();

  const router = useRouter();

  const { state, apply, reset } = useProductListParams();

  const [searchTerm, setSearchTerm] = useState('');

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
    { field: 'sku', headerName: 'SKU', width: 120, sortable: false },
    {
      field: 'name',
      headerName: 'Name',
      width: 200,
      hideable: false,
      renderCell: (params) => (
        <RenderCellProduct params={params} onViewRow={() => handleViewRow(params.row.id)} />
      ),
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      minWidth: 180,
      sortable: false,
      renderCell: (params) => <RenderCellDescription params={params} />,
    },
    { field: 'category', headerName: 'Category', width: 130, sortable: false },
    {
      field: 'price',
      headerName: 'Price',
      width: 100,
      valueFormatter: (value: number) => fCurrency(value),
    },
    {
      field: 'stock',
      headerName: 'Stock',
      width: 90,
      renderCell: (params) => <RenderCellStock params={params} />,
    },
    {
      field: 'weightKg',
      headerName: 'Weight (kg)',
      width: 110,
      sortable: false,
      valueFormatter: (value: number | null) => (value == null ? '-' : value),
    },
    {
      field: 'createdAt',
      headerName: 'Created at',
      width: 130,
      renderCell: (params) => <RenderCellCreatedAt params={params} />,
    },
    {
      field: 'updatedAt',
      headerName: 'Updated at',
      width: 130,
      renderCell: (params) => <RenderCellUpdatedAt params={params} />,
    },
    {
      type: 'actions',
      field: 'actions',
      headerName: ' ',
      align: 'right',
      headerAlign: 'right',
      width: 60,
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

  const {
    columns: sizedColumns,
    columnVisibilityModel,
    onColumnWidthChange,
    onColumnVisibilityModelChange,
    resetColumns,
    columnsCustomized,
  } = useProductListColumns(columns);

  const totalResults = pagination?.total ?? 0;

  const hasActiveFilters =
    !!state.q.length ||
    !!state.category.length ||
    state.minPrice !== undefined ||
    state.maxPrice !== undefined ||
    state.inStock !== undefined;

  return (
    <>
      <DashboardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <CustomBreadcrumbs
          heading="Product catalog"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Product', href: paths.dashboard.product.root },
            { name: 'Product catalog' },
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

        <Card sx={{ display: 'flex', flexDirection: 'column' }}>
          <DataGrid
            checkboxSelection
            disableRowSelectionOnClick
            rows={products}
            columns={sizedColumns}
            columnVisibilityModel={columnVisibilityModel}
            onColumnWidthChange={onColumnWidthChange}
            onColumnVisibilityModelChange={onColumnVisibilityModelChange}
            loading={productsLoading || productsValidating}
            pageSizeOptions={[10, 20, 50]}
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
                if (state.q.length) {
                  return <EmptyContent title={`No results found for "${state.q.join('", "')}"`} />;
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
                state,
                categories,
                totalResults,
                searchTerm,
                onSearchChange: setSearchTerm,
                onApply: apply,
                onReset: reset,
                selectedRowIds,
                onOpenConfirmDeleteRows: handleOpenConfirmDeleteRows,
                onResetColumns: resetColumns,
                columnsCustomized,
              },
            }}
            sx={{
              // The grid sizes to its rows: a short page must not leave a blank block
              // below the last one. The cap keeps the pagination footer reachable.
              maxHeight: 'calc(100vh - 240px)',
              [`& .${gridClasses.cell}`]: { alignItems: 'center', display: 'inline-flex' },
            }}
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
  state: IProductListState;
  categories: IProductCategory[];
  totalResults: number;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onApply: (changes: Partial<IProductListState>) => void;
  onReset: () => void;
  selectedRowIds: GridRowSelectionModel;
  onOpenConfirmDeleteRows: () => void;
  onResetColumns: () => void;
  columnsCustomized: boolean;
};

declare module '@mui/x-data-grid' {
  interface ToolbarPropsOverrides extends CustomToolbarProps {}
}

/**
 * The filters ARE the toolbar. GridToolbarColumnsButton reaches the grid through its
 * apiRef, which only exists inside this slot, so putting the filters here is what lets
 * both share one line instead of the columns button needing a band of its own.
 */
function CustomToolbar({
  state,
  categories,
  totalResults,
  searchTerm,
  onSearchChange,
  onApply,
  onReset,
  selectedRowIds,
  onOpenConfirmDeleteRows,
  onResetColumns,
  columnsCustomized,
}: CustomToolbarProps) {
  return (
    <>
      <ProductFiltersToolbar
        state={state}
        categories={categories}
        totalResults={totalResults}
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        onApply={onApply}
        onReset={onReset}
        gridControls={
          <>
            {!!selectedRowIds.length && (
              <Button
                size="small"
                color="error"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                onClick={onOpenConfirmDeleteRows}
              >
                Delete ({selectedRowIds.length})
              </Button>
            )}

            {columnsCustomized && (
              <Button
                size="small"
                color="inherit"
                startIcon={<Iconify icon="solar:restart-bold" />}
                onClick={onResetColumns}
              >
                Reset layout
              </Button>
            )}

            <GridToolbarColumnsButton />
          </>
        }
      />

      <Divider />
    </>
  );
}
