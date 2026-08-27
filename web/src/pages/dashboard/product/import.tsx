import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { ProductImportView } from 'src/sections/product/view';

// ----------------------------------------------------------------------

const metadata = { title: `Import products from CSV | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <ProductImportView />
    </>
  );
}
