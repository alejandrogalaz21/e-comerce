import { ImportIssuesTable } from './import-issues-table';

import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof ImportIssuesTable> = {
  title: 'Sections/Product/ImportIssuesTable',
  component: ImportIssuesTable,
};

export default meta;

type Story = StoryObj<typeof ImportIssuesTable>;

export const Default: Story = {
  args: {
    rows: [
      { line: 3, severity: 'skipped', message: 'blank row, nothing to import' },
      {
        line: 7,
        sku: 'YM-015',
        name: 'Yoga Mat',
        severity: 'rejected',
        message: "price is not a valid number: 'free'",
      },
      {
        line: 16,
        sku: 'DL-007',
        name: 'Desk Lamp',
        severity: 'rejected',
        message: 'stock must not be less than 0',
      },
      { line: 25, sku: 'HD-099', severity: 'rejected', message: 'name should not be empty' },
      {
        line: 36,
        sku: 'RS-001',
        name: 'Running Shoes',
        severity: 'updated',
        message: 'sku already exists with different data — updated',
      },
      { line: 62, severity: 'skipped', message: 'blank row, nothing to import' },
    ],
  },
};

export const RejectedByItsName: Story = {
  args: {
    rows: [
      {
        line: 20,
        sku: 'XS-001',
        name: "<script>alert('xss')</script>",
        severity: 'rejected',
        message: 'name contains invalid content: HTML markup is not allowed',
      },
      { line: 41, sku: 'WS-001', severity: 'rejected', message: 'name should not be empty' },
    ],
  },
};

export const OnlySkipped: Story = {
  args: {
    rows: [
      { line: 62, severity: 'skipped', message: 'blank row, nothing to import' },
      { line: 63, severity: 'skipped', message: 'blank row, nothing to import' },
    ],
  },
};
