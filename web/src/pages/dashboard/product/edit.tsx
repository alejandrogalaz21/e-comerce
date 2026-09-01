import { Helmet } from 'react-helmet-async';

import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';

import { ProductEditView } from 'src/sections/product/view';
import { useGetProductForAdmin } from 'src/sections/product/hooks/use-product';

const metadata = { title: `Product edit | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const { id = '' } = useParams();

  const { product } = useGetProductForAdmin(id);

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <ProductEditView product={product} />
    </>
  );
}
