import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useBoolean } from 'src/hooks/use-boolean';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { useCheckoutContext } from 'src/sections/checkout/context';

/**
 * Lives in the header rather than inside the shop view, so the cart does not
 * disappear the moment a visitor opens a product. Opening it shows what is in
 * there without leaving the page: seeing your cart should not cost you your place.
 */
export function MiniCart() {
  const open = useBoolean();

  const checkout = useCheckoutContext();

  const empty = !checkout.items.length;

  return (
    <>
      <Tooltip title="Cart">
        <IconButton onClick={open.onTrue} aria-label="Open cart">
          <Badge showZero badgeContent={checkout.totalItems} color="error" max={99}>
            <Iconify icon="solar:cart-3-bold" width={24} />
          </Badge>
        </IconButton>
      </Tooltip>

      <Drawer
        anchor="right"
        open={open.value}
        onClose={open.onFalse}
        PaperProps={{ sx: { width: 1, maxWidth: 380 } }}
      >
        <Stack direction="row" alignItems="center" sx={{ py: 2, pl: 2.5, pr: 1.5 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Cart
          </Typography>

          <IconButton onClick={open.onFalse} aria-label="Close cart">
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Stack>

        <Divider />

        {empty ? (
          <Box sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>
            <Iconify icon="solar:cart-3-bold" width={48} sx={{ mb: 2, opacity: 0.48 }} />
            <Typography variant="body2">Your cart is empty</Typography>
          </Box>
        ) : (
          <>
            <Scrollbar sx={{ flexGrow: 1 }}>
              <Stack spacing={2} sx={{ p: 2.5 }}>
                {checkout.items.map((item) => (
                  <Stack key={item.id} direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap>
                        {item.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {`${item.quantity} × ${fCurrency(item.price)}`}
                      </Typography>
                    </Box>

                    <Typography variant="subtitle2">
                      {fCurrency(item.price * item.quantity)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Scrollbar>

            <Divider />

            <Stack spacing={2} sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle1">Subtotal</Typography>
                <Typography variant="subtitle1">{fCurrency(checkout.subtotal)}</Typography>
              </Stack>

              <Button
                fullWidth
                size="large"
                variant="contained"
                component={RouterLink}
                href={paths.product.checkout}
                onClick={open.onFalse}
              >
                Check out
              </Button>
            </Stack>
          </>
        )}
      </Drawer>
    </>
  );
}
