import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export const navData = [
  {
    title: 'Home',
    path: paths.product.root,
    icon: <Iconify width={22} icon="solar:home-2-bold-duotone" />,
  },
  {
    title: 'Checkout',
    path: paths.product.checkout,
    icon: <Iconify width={22} icon="solar:cart-3-bold" />,
  },
  {
    title: 'Dashboard',
    path: CONFIG.auth.redirectPath,
    icon: <Iconify width={22} icon="solar:widget-5-bold-duotone" />,
  },
  {
    title: 'Status',
    path: paths.status,
    icon: <Iconify width={22} icon="solar:heart-pulse-bold" />,
  },
];
