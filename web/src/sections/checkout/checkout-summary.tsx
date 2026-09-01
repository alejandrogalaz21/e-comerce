import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

type Props = {
  total: number;
  subtotal: number;
  onEdit?: () => void;
};

export function CheckoutSummary({ total, onEdit, subtotal }: Props) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        title="Order summary"
        action={
          onEdit && (
            <Button size="small" onClick={onEdit} startIcon={<Iconify icon="solar:pen-bold" />}>
              Edit
            </Button>
          )
        }
      />

      <Stack spacing={2} sx={{ p: 3 }}>
        <Box display="flex">
          <Typography
            component="span"
            variant="body2"
            sx={{ flexGrow: 1, color: 'text.secondary' }}
          >
            Sub total
          </Typography>
          <Typography component="span" variant="subtitle2">
            {fCurrency(subtotal)}
          </Typography>
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box display="flex">
          <Typography component="span" variant="subtitle1" sx={{ flexGrow: 1 }}>
            Total
          </Typography>

          <Typography component="span" variant="subtitle1" sx={{ color: 'error.main' }}>
            {fCurrency(total)}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}
