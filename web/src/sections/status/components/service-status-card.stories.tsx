import { ServiceStatusCard } from './service-status-card';

import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof ServiceStatusCard> = {
  title: 'Sections/Status/ServiceStatusCard',
  component: ServiceStatusCard,
};

export default meta;

type Story = StoryObj<typeof ServiceStatusCard>;

export const OnlineWithRows: Story = {
  args: {
    title: 'API',
    subheader: 'Backend service health',
    loading: false,
    ok: true,
    rows: [
      { label: 'Status', value: 'ok' },
      { label: 'Environment', value: 'production' },
      { label: 'Uptime', value: '3d 4h 12m' },
      { label: 'Version', value: '1.4.2' },
    ],
  },
};

export const OfflineWithError: Story = {
  args: {
    title: 'Database',
    subheader: 'PostgreSQL connection',
    loading: false,
    ok: false,
    rows: [{ label: 'Status', value: 'down' }],
    error: 'Connection refused (ECONNREFUSED 127.0.0.1:5432)',
  },
};

export const Loading: Story = {
  args: {
    title: 'API',
    subheader: 'Backend service health',
    loading: true,
    rows: [],
  },
};
