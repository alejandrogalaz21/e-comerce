import type { IImportSummary } from 'src/types/product';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type Props = {
  summary: IImportSummary;
};

export function ImportSummary({ summary }: Props) {
  const stats: { label: string; value: number; color?: string }[] = [
    { label: 'Total rows', value: summary.totalRows },
    { label: 'Created', value: summary.inserted, color: 'success.main' },
    { label: 'Updated', value: summary.updated, color: 'info.main' },
    { label: 'Unchanged', value: summary.unchanged },
    { label: 'Rejected', value: summary.rejected, color: 'error.main' },
    { label: 'Skipped empty', value: summary.skippedEmpty, color: 'warning.main' },
  ];

  return (
    <Box
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
        <Card key={stat.label} sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ color: stat.color }}>
            {stat.value}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {stat.label}
          </Typography>
        </Card>
      ))}
    </Box>
  );
}
