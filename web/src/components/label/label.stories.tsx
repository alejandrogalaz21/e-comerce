import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Label } from './label';

import type { Meta, StoryObj } from '@storybook/react';
import type { LabelColor, LabelVariant } from './types';

const COLORS: LabelColor[] = [
  'default',
  'primary',
  'secondary',
  'info',
  'success',
  'warning',
  'error',
];

const VARIANTS: LabelVariant[] = ['filled', 'outlined', 'soft', 'inverted'];

const meta: Meta<typeof Label> = {
  title: 'Components/Label',
  component: Label,
  argTypes: {
    color: { control: 'select', options: COLORS },
    variant: { control: 'select', options: VARIANTS },
  },
};

export default meta;

type Story = StoryObj<typeof Label>;

export const Playground: Story = {
  args: {
    children: 'label',
    color: 'primary',
    variant: 'soft',
  },
};

export const Matrix: Story = {
  render: () => (
    <Stack spacing={3}>
      {VARIANTS.map((variant) => (
        <Stack key={variant} spacing={1}>
          <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
            {variant}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {COLORS.map((color) => (
              <Label key={color} color={color} variant={variant}>
                {color}
              </Label>
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  ),
};
