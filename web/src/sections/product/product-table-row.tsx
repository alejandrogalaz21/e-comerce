import type { GridCellParams } from '@mui/x-data-grid';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';

import { fCurrency } from 'src/utils/format-number';
import { fTime, fDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';

type ParamsProps = {
  params: GridCellParams;
};

export function RenderCellPrice({ params }: ParamsProps) {
  return fCurrency(params.row.price);
}

function RenderCellDate({ value }: { value: string }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="baseline" sx={{ minWidth: 0 }}>
      <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
        {fDate(value)}
      </Box>
      <Box
        component="span"
        sx={{ typography: 'caption', color: 'text.secondary', whiteSpace: 'nowrap' }}
      >
        {fTime(value)}
      </Box>
    </Stack>
  );
}

export function RenderCellCreatedAt({ params }: ParamsProps) {
  return <RenderCellDate value={params.row.createdAt} />;
}

export function RenderCellUpdatedAt({ params }: ParamsProps) {
  return <RenderCellDate value={params.row.updatedAt} />;
}

export function RenderCellDescription({ params }: ParamsProps) {
  const { description } = params.row;

  if (!description) {
    return (
      <Box component="span" sx={{ color: 'text.disabled' }}>
        —
      </Box>
    );
  }

  return (
    <Tooltip title={description} placement="top-start">
      <Box
        component="span"
        sx={{
          minWidth: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          color: 'text.secondary',
        }}
      >
        {description}
      </Box>
    </Tooltip>
  );
}

export function RenderCellStock({ params }: ParamsProps) {
  const { stock } = params.row;

  return (
    <Label
      variant="soft"
      color={(stock === 0 && 'error') || (stock < 10 && 'warning') || 'success'}
    >
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
  const discontinued = !!params.row.discontinuedAt;

  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
      <Link
        noWrap
        color={discontinued ? 'text.disabled' : 'inherit'}
        variant="subtitle2"
        onClick={onViewRow}
        sx={{ cursor: 'pointer' }}
      >
        {params.row.name}
      </Link>

      {discontinued && (
        <Label variant="soft" color="default" sx={{ flexShrink: 0 }}>
          Discontinued
        </Label>
      )}
    </Stack>
  );
}
