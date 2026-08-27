import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`${CONFIG.site.basePath}/assets/icons/navbar/${name}.svg`} />
);

const ICONS = {
  order: icon('ic-order'),
  product: icon('ic-product'),
};

// ----------------------------------------------------------------------

export const navData = [
  /**
   * Management
   */
  {
    subheader: 'Management',
    items: [
      {
        title: 'Product',
        path: paths.dashboard.product.root,
        icon: ICONS.product,
        children: [
          { title: 'List', path: paths.dashboard.product.root },
          { title: 'Create', path: paths.dashboard.product.new },
        ],
      },
      {
        title: 'Order',
        path: paths.dashboard.order.root,
        icon: ICONS.order,
        children: [{ title: 'List', path: paths.dashboard.order.root }],
      },
      {
        title: 'Status',
        path: paths.dashboard.status,
        icon: <Iconify icon="solar:heart-pulse-bold-duotone" />,
      },
    ],
  },
];
