import type { IAddressItem } from 'src/types/common';
import type { PaperProps } from '@mui/material/Paper';

import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';


type Props = PaperProps & {
  action?: React.ReactNode;
  address: IAddressItem;
};

export function AddressItem({ address, action, sx, ...other }: Props) {
  return (
    <Paper
      sx={{
        gap: 2,
        display: 'flex',
        position: 'relative',
        alignItems: { md: 'flex-end' },
        flexDirection: { xs: 'column', md: 'row' },
        ...sx,
      }}
      {...other}
    >
      <Stack flexGrow={1} spacing={1}>
        <Stack direction="row" alignItems="center">
          <Typography variant="subtitle2">{address.name}</Typography>
        </Stack>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {address.fullAddress}
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {address.phoneNumber}
        </Typography>
      </Stack>

      {action && action}
    </Paper>
  );
}
