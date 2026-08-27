import { ImportSummary } from './import-summary';

import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof ImportSummary> = {
  title: 'Sections/Product/ImportSummary',
  component: ImportSummary,
};

export default meta;

type Story = StoryObj<typeof ImportSummary>;

export const Default: Story = {
  args: {
    summary: {
      totalRows: 96,
      inserted: 80,
      updated: 4,
      unchanged: 1,
      rejected: 9,
      skippedEmpty: 2,
    },
  },
};
