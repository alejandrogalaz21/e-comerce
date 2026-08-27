import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { StatusView } from 'src/sections/status/view';

// ----------------------------------------------------------------------

const metadata = { title: `System status | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <StatusView />
    </>
  );
}
