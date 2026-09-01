import type { IImportSummary } from 'src/types/product';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { IMPORT_STATUS_META, importStatusTextColor } from '../import-utils';

import type { IImportStatus } from '../import-utils';

/** Card label and value per status; icon, color and hint come from the shared map. */
const CARDS: { status: IImportStatus; label: string; pick: (s: IImportSummary) => number }[] = [
  { status: 'total', label: 'Total rows', pick: (s) => s.totalRows },
  { status: 'created', label: 'Created', pick: (s) => s.inserted },
  { status: 'updated', label: 'Updated', pick: (s) => s.updated },
  { status: 'unchanged', label: 'Unchanged', pick: (s) => s.unchanged },
  { status: 'rejected', label: 'Rejected', pick: (s) => s.rejected },
  { status: 'skipped', label: 'Skipped empty', pick: (s) => s.skippedEmpty },
];

type Props = {
  summary: IImportSummary;
};

export function ImportSummary({ summary }: Props) {
  const stats = CARDS.map((card) => ({
    label: card.label,
    value: card.pick(summary),
    icon: IMPORT_STATUS_META[card.status].icon,
    color: importStatusTextColor(card.status),
    hint: IMPORT_STATUS_META[card.status].hint,
  }));

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
