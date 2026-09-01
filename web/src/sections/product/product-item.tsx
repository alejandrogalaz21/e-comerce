import type { IProductItem } from 'src/types/product';

import Fab from '@mui/material/Fab';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fCurrency } from 'src/utils/format-number';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/iconify';

import { categoryIcon } from './category-icon';
import { useCheckoutContext } from '../checkout/context';

const PLACEHOLDER_IMAGE = `${CONFIG.site.basePath}/assets/placeholder.svg`;

type Props = {
  product: IProductItem;
};

export function ProductItem({ product }: Props) {
  const checkout = useCheckoutContext();

  const { id, name, price, stock, category } = product;

  const linkTo = paths.product.details(id);

  const available = stock > 0;

  const handleAddCart = async () => {
    try {
      checkout.onAddToCart({
        id,
        name,
        price,
        stock,
        quantity: 1,
        coverUrl: PLACEHOLDER_IMAGE,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const renderImg = (
    <Box sx={{ position: 'relative', p: 1 }}>
      {available && (
        <Fab
          color="warning"
          size="medium"
          className="add-cart-btn"
          onClick={handleAddCart}
          sx={{
            right: 16,
            bottom: 16,
            zIndex: 9,
            opacity: 0,
            position: 'absolute',
            transition: (theme) =>
              theme.transitions.create('all', {
                easing: theme.transitions.easing.easeInOut,
                duration: theme.transitions.duration.shorter,
              }),
          }}
        >
          <Iconify icon="solar:cart-plus-bold" width={24} />
        </Fab>
      )}

      <Tooltip title={!available && 'Out of stock'} placement="bottom-end">
        {/* The catalog has no images, so a category icon says more than the same
            placeholder repeated on every card. */}
        <Box
          sx={{
            aspectRatio: '1/1',
            display: 'flex',
            borderRadius: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.neutral',
            color: 'text.secondary',
            ...(!available && { opacity: 0.48, filter: 'grayscale(1)' }),
          }}
        >
          <Iconify icon={categoryIcon(category)} width={72} />
        </Box>
      </Tooltip>
    </Box>
  );

  const renderContent = (
    <Stack spacing={2.5} sx={{ p: 3, pt: 2 }}>
      <Link component={RouterLink} href={linkTo} color="inherit" variant="subtitle2" noWrap>
        {name}
      </Link>

      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box component="span" sx={{ typography: 'body2', color: 'text.secondary' }}>
          {category}
        </Box>

        <Box component="span" sx={{ typography: 'subtitle1' }}>
          {fCurrency(price)}
        </Box>
      </Stack>
    </Stack>
  );

  return (
    <Card sx={{ '&:hover .add-cart-btn': { opacity: 1 } }}>
      {renderImg}

      {renderContent}
    </Card>
  );
}
