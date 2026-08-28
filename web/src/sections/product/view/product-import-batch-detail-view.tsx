import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { importStatusColor } from '../import-utils';
import { ImportSummary } from '../components/import-summary';
import { useGetImportBatch } from '../hooks/use-import-batches';
import { ImportRejectedTable } from '../components/import-rejected-table';

// ----------------------------------------------------------------------

type Props = {
  batchId: string;
};

export function ProductImportBatchDetailView({ batchId }: Props) {
  const { batch, batchLoading, batchError } = useGetImportBatch(batchId);

  if (batchLoading) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <LinearProgress />
      </DashboardContent>
    );
  }

  if (batchError || !batch) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Import batch not found!"
          action={
            <Button
              component={RouterLink}
              href={paths.dashboard.product.importBatches}
              startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to history
            </Button>
          }
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Import report"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Product', href: paths.dashboard.product.root },
          { name: 'Import history', href: paths.dashboard.product.importBatches },
          { name: batch.filename },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6">{batch.filename}</Typography>

          <Label variant="soft" color={importStatusColor(batch.status)}>
            {batch.status}
          </Label>

          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {fDateTime(batch.createdAt)}
          </Typography>

          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Imported by {batch.importedBy || '—'}
          </Typography>
        </Stack>

        <ImportSummary
          summary={{
            totalRows: batch.totalRows,
            inserted: batch.inserted,
            updated: batch.updated,
            unchanged: batch.unchanged,
            rejected: batch.rejected,
            skippedEmpty: batch.skippedEmpty,
          }}
        />

        {!!batch.report.warnings.length && (
          <Alert severity="warning">
            <Stack spacing={0.5}>
              {batch.report.warnings.map((warning) => (
                <span key={`${warning.line}-${warning.sku}`}>
                  Line {warning.line} ({warning.sku}): {warning.message}
                </span>
              ))}
            </Stack>
          </Alert>
        )}

        {!!batch.report.rejected.length && <ImportRejectedTable rows={batch.report.rejected} />}

        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
          <Button
            component={RouterLink}
            href={paths.dashboard.product.importBatches}
            variant="outlined"
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          >
            Back to history
          </Button>

          <Button
            component={RouterLink}
            href={paths.dashboard.product.import}
            variant="contained"
            startIcon={<Iconify icon="eva:cloud-upload-fill" />}
          >
            Import CSV
          </Button>
        </Stack>
      </Stack>
    </DashboardContent>
  );
}
