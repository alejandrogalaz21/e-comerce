import { enUS as enUSDate } from '@mui/x-date-pickers/locales';
import { enUS as enUSDataGrid } from '@mui/x-data-grid/locales';

export const allLangs = [
  {
    value: 'en',
    label: 'English',
    countryCode: 'GB',
    adapterLocale: 'en',
    numberFormat: { code: 'en-US', currency: 'USD' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components },
    },
  },
];
