import { ImportCreatedTable } from './import-created-table';

import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof ImportCreatedTable> = {
  title: 'Sections/Product/ImportCreatedTable',
  component: ImportCreatedTable,
};

export default meta;

type Story = StoryObj<typeof ImportCreatedTable>;

export const Default: Story = {
  args: {
    rows: [
      { line: 2, sku: 'RS-001', name: 'Running Shoes' },
      { line: 3, sku: 'WM-042', name: 'Wireless Mouse' },
      { line: 4, sku: 'GK-088', name: 'Gaming Keyboard' },
      { line: 5, sku: 'GC-025', name: 'Gift Card' },
    ],
  },
};
