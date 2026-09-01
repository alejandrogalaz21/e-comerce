import type { IProductItem } from 'src/types/product';

import { MemoryRouter } from 'react-router-dom';

import { CheckoutProvider } from 'src/sections/checkout/context';

import { ProductItem } from './product-item';

import type { Meta, StoryObj } from '@storybook/react';

const product: IProductItem = {
  id: 'story-product-1',
  sku: 'SKU-001',
  name: 'Wireless Headphones',
  description: 'Noise-cancelling over-ear headphones',
  category: 'Electronics',
  price: 129.99,
  stock: 12,
  weightKg: 0.35,
  discontinuedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const meta: Meta<typeof ProductItem> = {
  title: 'Sections/Product/ProductItem',
  component: ProductItem,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <CheckoutProvider>
          <div style={{ maxWidth: 320 }}>
            <Story />
          </div>
        </CheckoutProvider>
      </MemoryRouter>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ProductItem>;

export const InStock: Story = {
  args: {
    product,
  },
};

export const OutOfStock: Story = {
  args: {
    product: { ...product, id: 'story-product-2', stock: 0 },
  },
};
