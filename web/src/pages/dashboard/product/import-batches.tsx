import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { ProductImportBatchesView } from 'src/sections/product/view';

// ----------------------------------------------------------------------

const metadata = { title: `Import history | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <ProductImportBatchesView />
    </>
  );
}
