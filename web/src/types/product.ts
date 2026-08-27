export type ApiProduct = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  price: string;
  stock: number;
  weightKg: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IProductItem = {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  weightKg: number | null;
  createdAt: string;
  updatedAt: string;
};

export type IProductPayload = {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  stock: number;
  weightKg?: number;
};

export type IProductFormValues = {
  name: string;
  sku: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  weightKg: string;
};

export type IProductListParams = {
  page: number;
  limit: number;
};
