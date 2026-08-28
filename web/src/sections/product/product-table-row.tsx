import type { GridCellParams } from '@mui/x-data-grid';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';

import { fCurrency } from 'src/utils/format-number';
import { fTime, fDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

type ParamsProps = {
  params: GridCellParams;
};

export function RenderCellPrice({ params }: ParamsProps) {
  return fCurrency(params.row.price);
}

export function RenderCellCreatedAt({ params }: ParamsProps) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="baseline" sx={{ minWidth: 0 }}>
      <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
        {fDate(params.row.createdAt)}
      </Box>
      <Box
        component="span"
        sx={{ typography: 'caption', color: 'text.secondary', whiteSpace: 'nowrap' }}
      >
        {fTime(params.row.createdAt)}
      </Box>
    </Stack>
  );
}

export function RenderCellStock({ params }: ParamsProps) {
  const { stock } = params.row;

  return (
    <Label variant="soft" color={(stock === 0 && 'error') || (stock < 10 && 'warning') || 'success'}>
      {stock}
    </Label>
  );
}

export function RenderCellProduct({
  params,
  onViewRow,
}: ParamsProps & {
  onViewRow: () => void;
}) {
  return (
    <Link
      noWrap
      color="inherit"
      variant="subtitle2"
      onClick={onViewRow}
      sx={{ cursor: 'pointer' }}
    >
      {params.row.name}
    </Link>
  );
}
