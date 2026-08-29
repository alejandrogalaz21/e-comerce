import type { IImportSummary } from 'src/types/product';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Stat = {
  label: string;
  value: number;
  icon: string;
  color: string;
  hint: string;
};

type Props = {
  summary: IImportSummary;
};

export function ImportSummary({ summary }: Props) {
  const stats: Stat[] = [
    {
      label: 'Total rows',
      value: summary.totalRows,
      icon: 'solar:documents-bold-duotone',
      color: 'text.primary',
      hint: 'Data rows found in the file, header excluded',
    },
    {
      label: 'Created',
      value: summary.inserted,
      icon: 'solar:add-circle-bold-duotone',
      color: 'success.main',
      hint: 'New products inserted into the catalog',
    },
    {
      label: 'Updated',
      value: summary.updated,
      icon: 'solar:refresh-circle-bold-duotone',
      color: 'warning.main',
      hint: 'Existing SKUs whose data changed',
    },
    {
      label: 'Unchanged',
      value: summary.unchanged,
      icon: 'solar:check-circle-bold-duotone',
      color: 'text.secondary',
      hint: 'SKUs already stored with identical data',
    },
    {
      label: 'Rejected',
      value: summary.rejected,
      icon: 'solar:close-circle-bold-duotone',
      color: 'error.main',
      hint: 'Rows that failed validation and were not saved',
    },
    {
      label: 'Skipped empty',
      value: summary.skippedEmpty,
      icon: 'solar:eraser-bold-duotone',
      color: 'text.disabled',
      hint: 'Fully blank rows ignored as export noise',
    },
  ];

  return (
    <Box
      data-testid="import-summary"
      sx={{
        gap: 2,
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(6, 1fr)',
        },
      }}
    >
      {stats.map((stat) => (
        <Card key={stat.label} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ gap: 1, display: 'flex', alignItems: 'center', color: stat.color }}>
            <Iconify icon={stat.icon} width={22} />

            <Typography variant="h4" sx={{ lineHeight: 1 }}>
              {stat.value}
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>
            {stat.label}
          </Typography>

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {stat.hint}
          </Typography>
        </Card>
      ))}
    </Box>
  );
}
