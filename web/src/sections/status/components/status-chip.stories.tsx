import { StatusChip } from './status-chip';

import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof StatusChip> = {
  title: 'Sections/Status/StatusChip',
  component: StatusChip,
};

export default meta;

type Story = StoryObj<typeof StatusChip>;

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const Ok: Story = {
  args: {
    loading: false,
    ok: true,
  },
};

export const Offline: Story = {
  args: {
    loading: false,
    ok: false,
  },
};
