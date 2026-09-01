import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';

import { TableFilterBar } from './table-filter-bar';

import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof TableFilterBar> = {
  title: 'Sections/Product/TableFilterBar',
  component: TableFilterBar,
};

export default meta;

type Story = StoryObj<typeof TableFilterBar>;

export const Default: Story = {
  args: {
    value: '',
    placeholder: 'Filter by line, SKU, name, category or description...',
    label: 'Filter created rows',
    visibleCount: 85,
    totalCount: 85,
  },
};

export const Filtered: Story = {
  args: {
    value: 'speaker',
    placeholder: 'Filter by line, SKU, name, category or description...',
    label: 'Filter created rows',
    visibleCount: 3,
    totalCount: 85,
  },
};

export const WithExtraFilter: Story = {
  args: {
    value: '',
    placeholder: 'Filter by line, SKU, name or reason...',
    label: 'Filter rows to review',
    visibleCount: 12,
    totalCount: 12,
    children: (
      <FormControl size="small" sx={{ width: 180 }}>
        <InputLabel id="story-status">Status</InputLabel>
        <Select labelId="story-status" label="Status" value="all">
          <MenuItem value="all">All (12)</MenuItem>
          <MenuItem value="rejected">Rejected (5)</MenuItem>
        </Select>
      </FormControl>
    ),
  },
};
