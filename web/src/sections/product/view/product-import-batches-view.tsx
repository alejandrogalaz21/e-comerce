import type { IImportBatch } from 'src/types/product';
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import { DataGrid, gridClasses, GridActionsCellItem } from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useDebounce } from 'src/hooks/use-debounce';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { importStatusColor } from '../import-utils';
import { useGetImportBatches } from '../hooks/use-import-batches';

// ----------------------------------------------------------------------

export function ProductImportBatchesView() {
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

  const { batches, pagination, batchesLoading, batchesValidating, batchesEmpty } =
    useGetImportBatches({
      page: paginationModel.page + 1,
      limit: paginationModel.pageSize,
      q: debouncedSearchTerm,
    });

  const handleViewReport = useCallback(
    (id: string) => {
      router.push(paths.dashboard.product.importBatchDetail(id));
    },
    [router]
  );

  const columns: GridColDef<IImportBatch>[] = [
    { field: 'filename', headerName: 'Filename', flex: 1, minWidth: 220 },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Label variant="soft" color={importStatusColor(params.row.status)}>
          {params.row.status}
        </Label>
      ),
    },
    { field: 'totalRows', headerName: 'Total rows', width: 110 },
    { field: 'inserted', headerName: 'Created', width: 100 },
    { field: 'updated', headerName: 'Updated', width: 100 },
    {
      field: 'rejected',
      headerName: 'Rejected',
      width: 100,
      renderCell: (params) => (
        <Box component="span" sx={{ color: params.row.rejected > 0 ? 'error.main' : 'inherit' }}>
          {params.row.rejected}
        </Box>
      ),
    },
    {
      field: 'importedBy',
      headerName: 'Imported by',
      width: 200,
      valueFormatter: (value: string | null) => value || '—',
    },
    {
      field: 'createdAt',
      headerName: 'Date',
      width: 180,
      valueFormatter: (value: string) => fDateTime(value),
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
          icon={<Iconify icon="solar:eye-bold" />}
          label="View report"
          onClick={() => handleViewReport(params.row.id)}
        />,
      ],
    },
  ];

  return (
    <DashboardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <CustomBreadcrumbs
        heading="Import history"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Product', href: paths.dashboard.product.root },
          { name: 'Import history' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.product.import}
            variant="contained"
            startIcon={<Iconify icon="eva:cloud-upload-fill" />}
          >
            Import CSV
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {batchesEmpty && !debouncedSearchTerm ? (
        <EmptyContent
          filled
          title="No imports yet"
          description="Upload a CSV file to create your first import batch."
          action={
            <Button
              component={RouterLink}
              href={paths.dashboard.product.import}
              variant="contained"
              startIcon={<Iconify icon="eva:cloud-upload-fill" />}
              sx={{ mt: 3 }}
            >
              Import CSV
            </Button>
          }
          sx={{ py: 10 }}
        />
      ) : (
        <Card
          sx={{
            flexGrow: { md: 1 },
            display: { md: 'flex' },
            height: { xs: 800, md: 2 },
            flexDirection: { md: 'column' },
          }}
        >
          <Stack sx={{ p: 2.5 }}>
            <TextField
              size="small"
              value={searchTerm}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search by filename..."
              inputProps={{ 'aria-label': 'Search import batches' }}
              sx={{ width: { xs: 1, sm: 280 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="Clear search"
                      onClick={() => handleSearchChange('')}
                    >
                      <Iconify icon="mingcute:close-line" width={18} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
          </Stack>

          <Divider />

          <DataGrid
            disableRowSelectionOnClick
            rows={batches}
            columns={columns}
            loading={batchesLoading || batchesValidating}
            pageSizeOptions={[5, 10, 25]}
            paginationMode="server"
            rowCount={pagination?.total ?? 0}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            slots={{
              noRowsOverlay: () =>
                debouncedSearchTerm ? (
                  <EmptyContent title={`No imports found for "${debouncedSearchTerm}"`} />
                ) : (
                  <EmptyContent />
                ),
              noResultsOverlay: () => <EmptyContent title="No results found" />,
            }}
            sx={{ [`& .${gridClasses.cell}`]: { alignItems: 'center', display: 'inline-flex' } }}
          />
        </Card>
      )}
    </DashboardContent>
  );
}
