import type { IProductItem } from 'src/types/product';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { EmptyContent } from 'src/components/empty-content';

import { ProductList } from '../product-list';
import { CartIcon } from '../components/cart-icon';
import { useCheckoutContext } from '../../checkout/context';

// ----------------------------------------------------------------------

type Props = {
  products: IProductItem[];
  loading?: boolean;
};

export function ProductShopView({ products, loading }: Props) {
  const checkout = useCheckoutContext();

  const productsEmpty = !loading && !products.length;

  return (
    <Container sx={{ mb: 15 }}>
      <CartIcon totalItems={checkout.totalItems} />

      <Typography variant="h4" sx={{ my: { xs: 3, md: 5 } }}>
        Shop
      </Typography>

      {productsEmpty ? (
        <EmptyContent filled sx={{ py: 10 }} />
      ) : (
        <ProductList products={products} loading={loading} />
      )}
    </Container>
  );
}
