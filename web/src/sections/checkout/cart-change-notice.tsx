import type { ICheckoutItem } from 'src/types/checkout';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { fCurrency } from 'src/utils/format-number';

import { hasCartDifference } from './cart-reconcile';

type NoticeProps = {
  items: ICheckoutItem[];
  unverified?: boolean;
};

/**
 * One line telling the visitor how many of their products changed while the cart
 * waited. The detail lives in each line; this exists so nobody has to compare
 * them one by one to notice that something moved.
 */
export function CartChangeNotice({ items, unverified }: NoticeProps) {
  const changed = items.filter(hasCartDifference);
  const gone = changed.filter((item) => item.unavailable);

  if (unverified) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        Your cart could not be checked against the catalog. Prices and availability may have changed.
      </Alert>
    );
  }

  if (!changed.length) return null;

  return (
    <Alert severity={gone.length ? 'warning' : 'info'} sx={{ mb: 2 }}>
      {changed.length === 1
        ? '1 product changed since you added it.'
        : `${changed.length} products changed since you added them.`}
      {gone.length > 0 &&
        ' Remove what is no longer available to continue.'}
    </Alert>
  );
}

type LineProps = {
  item: ICheckoutItem;
};

/**
 * What changed in this line. A price, a quantity that no longer fits and a
 * withdrawn product change the deal and are shown as such; a rename is stated
 * plainly, because the order copies the name from the catalog when it is placed
 * and nothing the visitor pays depends on it.
 */
export function CartLineChanges({ item }: LineProps) {
  if (!hasCartDifference(item)) return null;

  return (
    <Box sx={{ mt: 0.5 }}>
      {item.unavailable && (
        <Typography variant="caption" component="div" sx={{ color: 'error.main' }}>
          No longer available — remove it to continue
        </Typography>
      )}

      {item.addedPrice !== undefined && (
        <Typography variant="caption" component="div" sx={{ color: 'warning.main' }}>
          Price changed:{' '}
          <Box component="span" sx={{ textDecoration: 'line-through' }}>
            {fCurrency(item.addedPrice)}
          </Box>{' '}
          → {fCurrency(item.price)}
        </Typography>
      )}

      {item.adjustedFrom !== undefined && (
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
