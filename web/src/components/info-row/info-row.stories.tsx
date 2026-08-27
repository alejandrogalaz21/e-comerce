import { InfoRow } from './info-row';

import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof InfoRow> = {
  title: 'Components/InfoRow',
  component: InfoRow,
};

export default meta;

type Story = StoryObj<typeof InfoRow>;

export const WithValue: Story = {
  args: {
    label: 'Environment',
    value: 'production',
  },
};

export const WithoutValue: Story = {
  args: {
    label: 'Latency',
  },
};
