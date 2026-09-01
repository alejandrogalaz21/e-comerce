import type { IProductItem } from 'src/types/product';
import type { ICheckoutItem } from 'src/types/checkout';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fCurrency } from 'src/utils/format-number';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/iconify';

import { IncrementerButton } from './components/incrementer-button';

const PLACEHOLDER_IMAGE = `${CONFIG.site.basePath}/assets/placeholder.svg`;

type Props = {
  product: IProductItem;
  items?: ICheckoutItem[];
  disableActions?: boolean;
  onGotoStep?: (step: number) => void;
  onAddCart?: (cartItem: ICheckoutItem) => void;
};

export function ProductDetailsSummary({
  items,
  product,
  onAddCart,
  onGotoStep,
  disableActions,
}: Props) {
  const router = useRouter();

  const { id, name, price, stock, category, description } = product;

  const [quantity, setQuantity] = useState(stock < 1 ? 0 : 1);

  const available = stock > 0;

  const existingQuantity = items?.find((item) => item.id === id)?.quantity ?? 0;

  const isMaxQuantity = existingQuantity + quantity > stock;

  const buildCartItem = useCallback(
    (): ICheckoutItem => ({
      id,
      name,
      price,
      stock,
      quantity,
      coverUrl: PLACEHOLDER_IMAGE,
      subtotal: price * quantity,
    }),
    [id, name, price, stock, quantity]
  );

  const handleAddCart = useCallback(() => {
    try {
      onAddCart?.(buildCartItem());
    } catch (error) {
      console.error(error);
    }
  }, [onAddCart, buildCartItem]);

  const handleBuyNow = useCallback(() => {
    try {
      if (!existingQuantity) {
        onAddCart?.(buildCartItem());
      }
      onGotoStep?.(0);
      router.push(paths.product.checkout);
    } catch (error) {
      console.error(error);
    }
  }, [existingQuantity, onAddCart, buildCartItem, onGotoStep, router]);

  return (
    <Stack spacing={3} sx={{ pt: 3 }}>
      <Stack spacing={2} alignItems="flex-start">
        <Box
          component="span"
          sx={{
            typography: 'overline',
            color: available ? 'success.main' : 'error.main',
          }}
        >
          {available ? 'In stock' : 'Out of stock'}
        </Box>

        <Typography variant="h5">{name}</Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {category}
        </Typography>

        <Box sx={{ typography: 'h5' }}>{fCurrency(price)}</Box>

        {!!description && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {description}
          </Typography>
        )}
      </Stack>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Stack direction="row">
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          Quantity
        </Typography>

        <Stack spacing={1}>
          <IncrementerButton
            name="quantity"
            quantity={quantity}
            disabledDecrease={quantity <= 1}
            disabledIncrease={quantity >= stock}
            onIncrease={() => setQuantity(quantity + 1)}
            onDecrease={() => setQuantity(quantity - 1)}
          />

          <Typography variant="caption" component="div" sx={{ textAlign: 'right' }}>
            Available: {stock}
          </Typography>
        </Stack>
      </Stack>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Stack direction="row" spacing={2}>
        <Button
          fullWidth
          disabled={isMaxQuantity || disableActions || !available}
          size="large"
          color="warning"
          variant="contained"
          startIcon={<Iconify icon="solar:cart-plus-bold" width={24} />}
          onClick={handleAddCart}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Add to cart
        </Button>

        <Button
          fullWidth
          size="large"
          variant="contained"
          disabled={disableActions || !available}
          onClick={handleBuyNow}
        >
          Buy now
        </Button>
      </Stack>
    </Stack>
  );
}
