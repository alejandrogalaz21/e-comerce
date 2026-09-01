import type { IProductHistoryEntry, IProductHistoryChange } from 'src/types/product';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';

import { useGetProductHistory } from '../hooks/use-product';

const OPERATION_LABEL: Record<IProductHistoryEntry['operation'], string> = {
  INSERT: 'Created',
  UPDATE: 'Changed',
  DELETE: 'Deleted',
};

const OPERATION_COLOR = {
  INSERT: 'success',
  UPDATE: 'warning',
  DELETE: 'error',
} as const;

const FIELD_LABEL: Record<string, string> = {
  discontinued_at: 'catalog status',
  weight_kg: 'weight',
  price: 'price',
  stock: 'stock',
  name: 'name',
  sku: 'sku',
  category: 'category',
  description: 'description',
};

type Props = {
  productId: string;
};

export function ProductHistoryTimeline({ productId }: Props) {
  const { entries, isPending, isError } = useGetProductHistory(productId);

  return (
    <Card sx={{ mt: 5, p: 3 }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        History
      </Typography>

      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Recorded by the database itself, so a change made through the CSV import counts the same as
        one made here.
      </Typography>

      {isPending && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Loading…
        </Typography>
      )}

      {isError && (
        <Typography variant="body2" sx={{ color: 'error.main' }}>
          The history could not be loaded.
        </Typography>
      )}

      {!isPending && !isError && entries.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No history recorded for this product. Entries start from the moment the change log was
          added, so products created before it have none.
        </Typography>
      )}

      <Stack divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />} spacing={2}>
        {entries.map((entry) => (
          <Stack key={entry.id} spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Label variant="soft" color={OPERATION_COLOR[entry.operation]}>
                {OPERATION_LABEL[entry.operation]}
              </Label>

              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {fDateTime(entry.changedAt)}
              </Typography>
            </Stack>

            {entry.changes.map((change) => (
              <ChangeLine key={change.field} change={change} />
            ))}
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}

/**
 * "The price changed" does not answer the question that brings somebody to a
 * history, so every value change reads from what to what.
 */
function ChangeLine({ change }: { change: IProductHistoryChange }) {
  const label = FIELD_LABEL[change.field] ?? change.field;

  if (change.field === 'discontinued_at') {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {change.to ? 'Taken off the catalog' : 'Put back on sale'}
      </Typography>
    );
  }

  return (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {label}:{' '}
      <Box component="span" sx={{ textDecoration: 'line-through' }}>
        {change.from ?? '—'}
      </Box>{' '}
      →{' '}
      <Box component="span" sx={{ color: 'text.primary' }}>
        {change.to ?? '—'}
      </Box>
    </Typography>
  );
}
