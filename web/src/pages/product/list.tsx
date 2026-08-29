import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { ProductShopView } from 'src/sections/product/view';
import { toShopQuery } from 'src/sections/product/shop-params';
import { useShopParams } from 'src/sections/product/hooks/use-shop-params';
import { useGetProducts, useGetProductCategories } from 'src/sections/product/hooks/use-product';

// ----------------------------------------------------------------------

const metadata = { title: `Shop - ${CONFIG.site.name}` };

export default function Page() {
  const { state } = useShopParams();

  const { products, pagination, productsLoading } = useGetProducts(toShopQuery(state));

  const { categories } = useGetProductCategories();

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <ProductShopView
        products={products}
        categories={categories}
        total={pagination?.total ?? 0}
        loading={productsLoading}
      />
    </>
  );
}
