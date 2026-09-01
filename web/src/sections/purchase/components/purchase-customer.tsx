import type { IShippingAddress } from 'src/types/purchase';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

type Props = {
  address: IShippingAddress | null;
};

/**
 * Who the order ships to, which is what a person searching for it actually
 * remembers. Orders placed before deliveries were recorded have no address.
 */
export function PurchaseCustomer({ address }: Props) {
  if (!address) {
    return (
      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
        —
      </Typography>
    );
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" noWrap>
        {address.name}
      </Typography>
      {address.phone && (
        <Typography variant="caption" noWrap sx={{ display: 'block', color: 'text.secondary' }}>
          {address.phone}
        </Typography>
      )}
    </Box>
  );
}
