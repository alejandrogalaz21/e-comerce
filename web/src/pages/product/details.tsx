import { Helmet } from 'react-helmet-async';

import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';

import { ProductShopDetailsView } from 'src/sections/product/view';
import { useGetProduct } from 'src/sections/product/hooks/use-product';

const metadata = { title: `Product details - ${CONFIG.site.name}` };

export default function Page() {
  const { id = '' } = useParams();

  const { product, productLoading, productError } = useGetProduct(id);

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <ProductShopDetailsView product={product} loading={productLoading} error={productError} />
    </>
  );
}
