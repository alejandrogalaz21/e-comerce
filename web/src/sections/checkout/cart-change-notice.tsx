import type { ICheckoutItem } from 'src/types/checkout';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { fCurrency } from 'src/utils/format-number';

import { isPurchasable, hasCartDifference } from './cart-reconcile';

type NoticeProps = {
  items: ICheckoutItem[];
  unverified?: boolean;
};

export function CartChangeNotice({ items, unverified }: NoticeProps) {
  const changed = items.filter(hasCartDifference);
  const blocking = items.filter((item) => !isPurchasable(item));

  if (unverified) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        Your cart could not be checked against the catalog. Prices and availability may have
        changed.
      </Alert>
    );
  }

  if (!changed.length) return null;

  return (
    <Alert severity={blocking.length ? 'error' : 'info'} sx={{ mb: 2 }}>
      {changed.length === 1
        ? '1 product changed since you added it.'
        : `${changed.length} products changed since you added them.`}
      {blocking.length > 0 && ' Remove what cannot be bought to continue.'}
    </Alert>
  );
}

type LineProps = {
  item: ICheckoutItem;
};

export function CartLineChanges({ item }: LineProps) {
  if (!hasCartDifference(item)) return null;

  const dearer = item.addedPrice !== undefined && item.price > item.addedPrice;
  const soldOut = !item.unavailable && item.stock === 0;
  const trimmed = item.adjustedFrom !== undefined && !soldOut;

  return (
    <Box sx={{ mt: 0.5 }}>
      {item.unavailable && (
        <Typography variant="caption" component="div" sx={{ color: 'error.main' }}>
          No longer available — remove it to continue
        </Typography>
      )}

      {soldOut && (
        <Typography variant="caption" component="div" sx={{ color: 'error.main' }}>
          Out of stock — remove it to continue
        </Typography>
      )}

      {item.addedPrice !== undefined && (
        <Typography
          variant="caption"
          component="div"
          sx={{ color: dearer ? 'warning.main' : 'success.main' }}
        >
          {dearer ? 'Price went up: ' : 'Price went down: '}
          <Box component="span" sx={{ textDecoration: 'line-through' }}>
            {fCurrency(item.addedPrice)}
          </Box>{' '}
          → {fCurrency(item.price)}
        </Typography>
      )}

      {trimmed && (
        <Typography variant="caption" component="div" sx={{ color: 'warning.main' }}>
          {`Quantity lowered from ${item.adjustedFrom} to ${item.quantity}: that is all the stock left`}
        </Typography>
      )}

      {item.addedName !== undefined && (
        <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
          {`Added as "${item.addedName}"`}
        </Typography>
      )}
    </Box>
  );
}
