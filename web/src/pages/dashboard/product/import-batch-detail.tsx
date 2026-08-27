import { Helmet } from 'react-helmet-async';

import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';

import { ProductImportBatchDetailView } from 'src/sections/product/view';

// ----------------------------------------------------------------------

const metadata = { title: `Import report | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const { batchId = '' } = useParams();

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <ProductImportBatchDetailView batchId={batchId} />
    </>
  );
}
