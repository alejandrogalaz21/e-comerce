import type { IShippingAddress } from 'src/types/purchase';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

type Props = {
  address: IShippingAddress | null;
};

export function PurchaseAddress({ address }: Props) {
  const street = address?.address ?? '';
  const place = address
    ? [address.city, address.state, address.zipCode, address.country].filter(Boolean).join(', ')
    : '';

  if (!street && !place) {
    return (
      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
        —
      </Typography>
    );
  }

  return (
    <Tooltip title={[street, place].filter(Boolean).join(' — ')}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap>
          {street || '—'}
        </Typography>

        {place && (
          <Typography variant="caption" noWrap sx={{ display: 'block', color: 'text.secondary' }}>
            {place}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
}
