import type { ICheckoutItem } from 'src/types/checkout';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { CategoryIcon } from 'src/components/category-icon';

import { CartLineChanges } from './cart-change-notice';
import { IncrementerButton } from '../product/components/incrementer-button';

type Props = {
  row: ICheckoutItem;
  onDelete: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
};

export function CheckoutCartProduct({ row, onDelete, onDecrease, onIncrease }: Props) {
  return (
    <TableRow>
      <TableCell>
        <Stack spacing={2} direction="row" alignItems="center">
          <CategoryIcon category={row.category} size={64} />

          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap variant="subtitle2" sx={{ maxWidth: 240 }}>
              {row.name}
            </Typography>

            <CartLineChanges item={row} />
          </Box>
        </Stack>
      </TableCell>

      <TableCell>{fCurrency(row.price)}</TableCell>

      <TableCell>
        <Box sx={{ width: 88, textAlign: 'right' }}>
          <IncrementerButton
            quantity={row.quantity}
            onDecrease={onDecrease}
            onIncrease={onIncrease}
            disabledDecrease={row.quantity <= 1}
            disabledIncrease={row.unavailable || row.quantity >= row.stock}
          />

          <Typography variant="caption" component="div" sx={{ color: 'text.secondary', mt: 1 }}>
            available: {row.stock}
          </Typography>
        </Box>
      </TableCell>

      <TableCell align="right">{fCurrency(row.price * row.quantity)}</TableCell>

      <TableCell align="right" sx={{ px: 1 }}>
        <IconButton onClick={onDelete}>
          <Iconify icon="solar:trash-bin-trash-bold" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}
