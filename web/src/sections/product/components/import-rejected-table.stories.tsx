import { ImportRejectedTable } from './import-rejected-table';

import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof ImportRejectedTable> = {
  title: 'Sections/Product/ImportRejectedTable',
  component: ImportRejectedTable,
};

export default meta;

type Story = StoryObj<typeof ImportRejectedTable>;

export const Default: Story = {
  args: {
    rows: [
      { line: 7, sku: 'YM-015', errors: ["price is not a valid number: 'free'"] },
      { line: 16, sku: 'DL-007', errors: ['stock must not be less than 0'] },
      { line: 25, errors: ['name should not be empty'] },
    ],
  },
};
