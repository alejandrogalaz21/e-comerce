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
      {
        line: 7,
        sku: 'YM-015',
        severity: 'rejected',
        message: "price is not a valid number: 'free'",
      },
      { line: 16, sku: 'DL-007', severity: 'rejected', message: 'stock must not be less than 0' },
      { line: 25, severity: 'rejected', message: 'name should not be empty' },
      {
        line: 36,
        sku: 'RS-001',
        severity: 'updated',
        message: 'sku already exists with different data — updated',
      },
      {
        line: 56,
        sku: 'BS-021',
        severity: 'updated',
        message: 'sku already exists with different data — updated',
      },
    ],
  },
};

export const OnlyRejected: Story = {
  args: {
    rows: [
      {
        line: 20,
        sku: 'XS-001',
        severity: 'rejected',
        message: 'name contains invalid content: HTML markup is not allowed',
      },
    ],
  },
};
