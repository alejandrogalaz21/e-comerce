import type { IImportIssueRow } from 'src/types/product';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import CardHeader from '@mui/material/CardHeader';
import TableContainer from '@mui/material/TableContainer';

import { varAlpha } from 'src/theme/styles';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { IMPORT_ISSUE_META } from '../import-utils';

// ----------------------------------------------------------------------

type Props = {
  rows: IImportIssueRow[];
};

export function ImportIssuesTable({ rows }: Props) {
  const rejectedCount = rows.filter((row) => row.severity === 'rejected').length;
  const updatedCount = rows.length - rejectedCount;

  return (
    <Card data-testid="import-issues">
      <CardHeader
        title={`Rows with issues (${rows.length})`}
        subheader={`${rejectedCount} rejected and not saved, ${updatedCount} overwrote an existing SKU`}
        sx={{ mb: 2 }}
      />

      <Scrollbar>
        <TableContainer sx={{ minWidth: 640 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 160 }}>Status</TableCell>
                <TableCell sx={{ width: 80 }}>Line</TableCell>
                <TableCell sx={{ width: 140 }}>SKU</TableCell>
                <TableCell>Reason</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row) => {
                const meta = IMPORT_ISSUE_META[row.severity];

                return (
                  <TableRow
                    key={`${row.severity}-${row.line}`}
                    sx={(theme) => ({
                      bgcolor: varAlpha(theme.vars.palette[meta.color].mainChannel, 0.08),
                    })}
                  >
                    <TableCell>
                      <Label
                        variant="soft"
                        color={meta.color}
                        startIcon={<Iconify icon={meta.icon} />}
                      >
                        {meta.label}
                      </Label>
                    </TableCell>

                    <TableCell>{row.line}</TableCell>

                    <TableCell>{row.sku ?? '—'}</TableCell>

                    <TableCell>{row.message}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Scrollbar>

      <Box
        sx={{
          px: 3,
          py: 2,
          gap: 3,
          display: 'flex',
          flexWrap: 'wrap',
          color: 'text.secondary',
          typography: 'caption',
        }}
      >
        <Box sx={{ gap: 0.75, display: 'flex', alignItems: 'center' }}>
          <Iconify icon={IMPORT_ISSUE_META.rejected.icon} sx={{ color: 'error.main' }} />
          Rejected row: failed validation, nothing was saved
        </Box>

        <Box sx={{ gap: 0.75, display: 'flex', alignItems: 'center' }}>
          <Iconify icon={IMPORT_ISSUE_META.updated.icon} sx={{ color: 'warning.main' }} />
          Updated row: the SKU already existed and its data was overwritten
        </Box>
      </Box>
    </Card>
  );
}
