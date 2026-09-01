import { paths } from 'src/routes/paths';

import { Iconify } from 'src/components/iconify';

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
];
