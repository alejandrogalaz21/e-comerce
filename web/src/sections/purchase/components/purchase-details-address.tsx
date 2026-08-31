import type { IShippingAddress } from 'src/types/purchase';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type Props = {
  address: IShippingAddress | null;
};

export function PurchaseDetailsAddress({ address }: Props) {
  return (
    <Card>
      <CardHeader title="Delivery" />

      <Stack spacing={0.5} sx={{ p: 3 }}>
        {address ? (
          <>
            <Typography variant="subtitle2">{address.name}</Typography>

            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {[address.address, address.city, address.state, address.zipCode, address.country]
                .filter(Boolean)
                .join(', ')}
            </Typography>

            {address.phone && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {address.phone}
              </Typography>
            )}
          </>
        ) : (
          // Saying so beats an empty block, which reads as a failed load.
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            No delivery address was recorded for this order.
          </Typography>
        )}
      </Stack>
    </Card>
  );
}
