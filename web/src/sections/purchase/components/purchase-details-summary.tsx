import type { IPurchase } from 'src/types/purchase';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { fCurrency } from 'src/utils/format-number';

import { sumSubtotals } from '../purchase-utils';

type Props = {
  purchase: IPurchase;
};

export function PurchaseDetailsSummary({ purchase }: Props) {
  const subtotal = sumSubtotals(purchase.items);

  return (
    <Card>
      <CardHeader title="Summary" />

      <Stack spacing={2} sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Subtotal
          </Typography>
          <Typography variant="body2">{fCurrency(subtotal)}</Typography>
        </Stack>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Stack direction="row" justifyContent="space-between">
          <Box component="span" sx={{ typography: 'subtitle1' }}>
            Total
          </Box>
          <Box component="span" sx={{ typography: 'subtitle1' }}>
            {fCurrency(purchase.total)}
          </Box>
        </Stack>
      </Stack>
    </Card>
  );
}
