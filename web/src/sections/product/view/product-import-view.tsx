import { useState, useCallback } from 'react';

import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import CardHeader from '@mui/material/CardHeader';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { Upload } from 'src/components/upload';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { ImportSummary } from '../components/import-summary';
import { ImportReportTables } from '../components/import-report-tables';
import { getErrorMessage, useImportProducts } from '../hooks/use-product';

// ----------------------------------------------------------------------

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function ProductImportView() {
  const [file, setFile] = useState<File | null>(null);

  const importProducts = useImportProducts();

  const result = importProducts.data;

  const handleDrop = useCallback((acceptedFiles: File[]) => {
    setFile(acceptedFiles[0] ?? null);
  }, []);

  const handleRemove = useCallback(() => {
    setFile(null);
  }, []);

  const handleImport = useCallback(() => {
    if (file) {
      importProducts.mutate(file);
    }
  }, [file, importProducts]);

  const handleReset = useCallback(() => {
    setFile(null);
    importProducts.reset();
  }, [importProducts]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Import CSV"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Product', href: paths.dashboard.product.root },
          { name: 'Import CSV' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.product.importBatches}
            variant="outlined"
            startIcon={<Iconify icon="solar:history-bold" />}
          >
            Import history
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {result ? (
        <Stack spacing={3}>
          <ImportSummary summary={result.summary} />

          <ImportReportTables report={result} />

          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button variant="outlined" onClick={handleReset}>
              Import another file
            </Button>

            <Button
              component={RouterLink}
              href={paths.dashboard.product.importBatchDetail(result.batchId)}
              variant="outlined"
              startIcon={<Iconify icon="solar:history-bold" />}
            >
              View in history
            </Button>

            <Button
              component={RouterLink}
              href={paths.dashboard.product.root}
              variant="contained"
              startIcon={<Iconify icon="solar:list-bold" />}
            >
              Go to products
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Card>
          <CardHeader
            title="Upload file"
            subheader="CSV with headers: name, sku, description, category, price, stock, weight_kg"
            sx={{ mb: 3 }}
          />

          <Stack spacing={3} sx={{ p: 3, pt: 0 }}>
            {!!importProducts.error && (
              <Alert severity="error">{getErrorMessage(importProducts.error)}</Alert>
            )}

            <Upload
              multiple
              maxFiles={1}
              value={file ? [file] : []}
              onDrop={handleDrop}
              onRemove={handleRemove}
              accept={{ 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.csv'] }}
              maxSize={MAX_FILE_SIZE}
              disabled={importProducts.isPending}
              helperText="Allowed *.csv files up to 5MB"
            />

            <Stack direction="row" justifyContent="flex-end">
              <LoadingButton
                variant="contained"
                startIcon={<Iconify icon="eva:cloud-upload-fill" />}
                disabled={!file}
                loading={importProducts.isPending}
                onClick={handleImport}
              >
                Import
              </LoadingButton>
            </Stack>
          </Stack>
        </Card>
      )}
    </DashboardContent>
  );
}
