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
      {
        line: 2,
        sku: 'RS-001',
        name: 'Running Shoes',
        description: 'Lightweight running shoes for daily training',
        category: 'Footwear',
        price: '89.99',
        stock: 150,
        weightKg: '0.35',
      },
      {
        line: 3,
        sku: 'WM-042',
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse with USB receiver',
        category: 'Electronics',
        price: '29.99',
        stock: 75,
        weightKg: '0.12',
      },
      {
        line: 4,
        sku: 'GC-025',
        name: 'Gift Card',
        description: null,
        category: 'Uncategorized',
        price: '0.00',
        stock: 999,
        weightKg: null,
      },
    ],
  },
};

/** Batches imported before the extra fields existed still render, with placeholders. */
export const HistoricalBatch: Story = {
  args: {
    rows: [
      { line: 2, sku: 'RS-001', name: 'Running Shoes' },
      { line: 3, sku: 'WM-042', name: 'Wireless Mouse' },
    ],
  },
};

/** With no matching term the table says so instead of going silently blank. */
export const NoFilterMatch: Story = {
  args: {
    rows: [
      {
        line: 2,
        sku: 'RS-001',
        name: 'Running Shoes',
        description: 'Lightweight running shoes for daily training',
        category: 'Footwear',
        price: '89.99',
        stock: 150,
        weightKg: '0.35',
      },
    ],
  },
};
