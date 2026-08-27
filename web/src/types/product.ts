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

export type IImportSummary = {
  totalRows: number;
  inserted: number;
  updated: number;
  unchanged: number;
  rejected: number;
  skippedEmpty: number;
};

export type IImportRejectedRow = {
  line: number;
  sku?: string;
  errors: string[];
};

export type IImportWarning = {
  line: number;
  sku: string;
  message: string;
};

export type IImportResult = {
  batchId: string;
  summary: IImportSummary;
  rejected: IImportRejectedRow[];
  warnings: IImportWarning[];
};
