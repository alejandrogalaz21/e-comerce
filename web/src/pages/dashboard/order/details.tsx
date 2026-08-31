import { Helmet } from 'react-helmet-async';

import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';

import { PurchaseDetailsView } from 'src/sections/purchase/view';

// ----------------------------------------------------------------------

const metadata = { title: `Order details | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const { id = '' } = useParams();

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <PurchaseDetailsView id={id} />
    </>
  );
}
