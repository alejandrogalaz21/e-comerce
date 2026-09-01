import type { ICheckoutItem } from 'src/types/checkout';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { CategoryIcon } from 'src/components/category-icon';

type Props = {
  total: number;
  subtotal: number;
  items?: ICheckoutItem[];
  onEdit?: () => void;
};

export function CheckoutSummary({ total, items, onEdit, subtotal }: Props) {
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
        {/* Confirming a charge without seeing what is being charged for asks the
            visitor to trust a number. The lines are what the total is made of. */}
        {items?.map((item) => (
          <Box key={item.id} display="flex" sx={{ gap: 1.5, alignItems: 'center' }}>
            <CategoryIcon category={item.category} size={36} />

            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {item.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {`${item.quantity} × ${fCurrency(item.price)}`}
              </Typography>
            </Box>

            <Typography variant="body2">{fCurrency(item.price * item.quantity)}</Typography>
          </Box>
        ))}

        {!!items?.length && <Divider sx={{ borderStyle: 'dashed' }} />}

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
