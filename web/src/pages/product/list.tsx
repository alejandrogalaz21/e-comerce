import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { ProductShopView } from 'src/sections/product/view';
import { useGetProducts } from 'src/sections/product/hooks/use-product';

// ----------------------------------------------------------------------

const metadata = { title: `Product shop - ${CONFIG.site.name}` };

export default function Page() {
  const { products, productsLoading } = useGetProducts({ page: 1, limit: 24 });

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <ProductShopView products={products} loading={productsLoading} />
    </>
  );
}
