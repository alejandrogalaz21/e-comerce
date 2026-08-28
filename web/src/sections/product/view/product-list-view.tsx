import type {
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
} from '@mui/x-data-grid';

import { useState, useCallback } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
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

import { useGetProducts, useDeleteProduct } from '../hooks/use-product';
import {
  RenderCellStock,
  RenderCellProduct,
  RenderCellCreatedAt,
} from '../product-table-row';

// ----------------------------------------------------------------------

export function ProductListView() {
  const confirmRows = useBoolean();

  const router = useRouter();

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });

  const [searchTerm, setSearchTerm] = useState('');

  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
  }, []);

  const { products, pagination, productsLoading, productsValidating } = useGetProducts({
    page: paginationModel.page + 1,
    limit: paginationModel.pageSize,
    q: debouncedSearchTerm,
  });

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

  const columns: GridColDef[] = [
    { field: 'sku', headerName: 'SKU', width: 140 },
    {
      field: 'name',
      headerName: 'Product',
      flex: 1,
      minWidth: 240,
      hideable: false,
      renderCell: (params) => (
        <RenderCellProduct params={params} onViewRow={() => handleViewRow(params.row.id)} />
      ),
    },
    { field: 'category', headerName: 'Category', width: 160 },
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
      valueFormatter: (value: number | null) => (value == null ? '-' : value),
    },
    {
      field: 'createdAt',
      headerName: 'Created at',
      width: 160,
      renderCell: (params) => <RenderCellCreatedAt params={params} />,
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
          <DataGrid
            checkboxSelection
            disableRowSelectionOnClick
            rows={products}
            columns={columns}
            loading={productsLoading || productsValidating}
            pageSizeOptions={[5, 10, 25]}
            paginationMode="server"
            rowCount={pagination?.total ?? 0}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            onRowSelectionModelChange={(newSelectionModel) => setSelectedRowIds(newSelectionModel)}
            slots={{
              toolbar: CustomToolbar,
              noRowsOverlay: () =>
                debouncedSearchTerm ? (
                  <EmptyContent title={`No results found for "${debouncedSearchTerm}"`} />
                ) : (
                  <EmptyContent />
                ),
              noResultsOverlay: () => <EmptyContent title="No results found" />,
            }}
            slotProps={{
              toolbar: {
                searchTerm,
                onSearchChange: handleSearchChange,
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
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedRowIds: GridRowSelectionModel;
  onOpenConfirmDeleteRows: () => void;
};

declare module '@mui/x-data-grid' {
  interface ToolbarPropsOverrides extends CustomToolbarProps {}
}

function CustomToolbar({
  searchTerm,
  onSearchChange,
  selectedRowIds,
  onOpenConfirmDeleteRows,
}: CustomToolbarProps) {
  return (
    <GridToolbarContainer>
      <Stack
        spacing={1}
        flexGrow={1}
        direction="row"
        alignItems="center"
        justifyContent="flex-end"
      >
        <TextField
          size="small"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search products..."
          inputProps={{ 'aria-label': 'Search products' }}
          sx={{ mr: 'auto', width: { xs: 1, sm: 280 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
            endAdornment: searchTerm ? (
              <InputAdornment position="end">
                <IconButton size="small" aria-label="Clear search" onClick={() => onSearchChange('')}>
                  <Iconify icon="mingcute:close-line" width={18} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

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

        <GridToolbarColumnsButton />
      </Stack>
    </GridToolbarContainer>
  );
}
