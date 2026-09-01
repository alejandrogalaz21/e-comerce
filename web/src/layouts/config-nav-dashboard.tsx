import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';

const icon = (name: string) => (
  <SvgColor src={`${CONFIG.site.basePath}/assets/icons/navbar/${name}.svg`} />
);

const ICONS = {
  order: icon('ic-order'),
  product: icon('ic-product'),
};

export const navData = [
  {
    subheader: 'Management',
    items: [
      {
        title: 'Product',
        path: paths.dashboard.product.root,
        icon: ICONS.product,
        children: [
          { title: 'Product catalog', path: paths.dashboard.product.root },
          { title: 'Create', path: paths.dashboard.product.new },
          { title: 'Import CSV', path: paths.dashboard.product.import },
          { title: 'Import history', path: paths.dashboard.product.importBatches },
        ],
      },
      {
        title: 'Orders',
        path: paths.dashboard.order.root,
        icon: ICONS.order,
        children: [{ title: 'Placed orders', path: paths.dashboard.order.root }],
      },
      {
        title: 'Status',
        path: paths.dashboard.status,
        icon: <Iconify icon="solar:heart-pulse-bold-duotone" />,
      },
    ],
  },
];
