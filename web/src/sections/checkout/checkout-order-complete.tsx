import type { IPurchase } from 'src/types/purchase';
import type { DialogProps } from '@mui/material/Dialog';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { fCurrency } from 'src/utils/format-number';

import { OrderCompleteIllustration } from 'src/assets/illustrations';

import { Iconify } from 'src/components/iconify';

type Props = DialogProps & {
  onReset: () => void;
  onDownloadPDF: () => void;
  purchase?: IPurchase | null;
};

export function CheckoutOrderComplete({ open, onReset, onDownloadPDF, purchase }: Props) {
  return (
    <Dialog
      fullWidth
      fullScreen
      open={open}
      PaperProps={{
        sx: {
          width: { md: `calc(100% - 48px)` },
          height: { md: `calc(100% - 48px)` },
        },
      }}
    >
      <Box
        gap={5}
        display="flex"
        alignItems="center"
        flexDirection="column"
        sx={{
          py: 5,
          m: 'auto',
          maxWidth: 480,
          textAlign: 'center',
          px: { xs: 2, sm: 0 },
        }}
      >
        <Typography variant="h4">Thank you for your purchase!</Typography>

        <OrderCompleteIllustration />

        <Typography>
          Thanks for placing your order
          <br />
          <br />
          <Box component="span" sx={{ typography: 'subtitle2' }}>
            {purchase?.id ?? ''}
          </Box>
          <br />
          <br />
          We will send you a notification within 5 days when it ships.
          <br /> If you have any question or queries then feel free to contact us. <br />
          All the best,
        </Typography>

        {purchase && (
          <>
            <Divider sx={{ width: 1, borderStyle: 'dashed' }} />

            <Stack spacing={1} sx={{ width: 1, textAlign: 'left' }}>
              {purchase.items.map((item) => (
                <Box key={item.id} sx={{ gap: 2, display: 'flex', typography: 'body2' }}>
                  <Box sx={{ flexGrow: 1 }}>
                    {item.name}
                    <Box component="span" sx={{ color: 'text.secondary' }}>
                      {` · ${item.sku} · x${item.quantity}`}
                    </Box>
                  </Box>

                  <Box>{fCurrency(item.subtotal)}</Box>
                </Box>
              ))}

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Box sx={{ gap: 2, display: 'flex', typography: 'subtitle1' }}>
                <Box sx={{ flexGrow: 1 }}>Total</Box>
                <Box>{fCurrency(purchase.total)}</Box>
              </Box>
            </Stack>
          </>
        )}

        <Divider sx={{ width: 1, borderStyle: 'dashed' }} />

        <Box gap={2} display="flex" flexWrap="wrap" justifyContent="center">
          <Button
            size="large"
            color="inherit"
            variant="outlined"
            onClick={onReset}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          >
            Continue shopping
          </Button>

          <Button
            size="large"
            variant="contained"
            startIcon={<Iconify icon="eva:cloud-download-fill" />}
            onClick={onDownloadPDF}
          >
            Download as PDF
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
