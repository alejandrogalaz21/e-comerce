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

export const PRODUCT_SORT_FIELDS = ['name', 'price', 'stock', 'createdAt', 'updatedAt'] as const;

export type IProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

export type IProductSortDirection = 'asc' | 'desc';

export type IProductFilters = {
  q?: string[];
  category?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
};

export type IProductListParams = IProductFilters & {
  page: number;
  limit: number;
  sortBy?: IProductSortField;
  sortDir?: IProductSortDirection;
};

export type IProductCategory = {
  category: string;
  count: number;
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
  name?: string;
  errors: string[];
};

export type IImportWarning = {
  line: number;
  sku: string;
  name?: string;
  message: string;
};

export type IImportSkippedRow = {
  line: number;
};

export type IImportCreatedRow = {
  line: number;
  sku: string;
  name: string;
  description?: string | null;
  category?: string;
  price?: string;
  stock?: number;
  weightKg?: string | null;
};

export type IImportReport = {
  rejected: IImportRejectedRow[];
  warnings: IImportWarning[];
  created: IImportCreatedRow[];
  skipped?: IImportSkippedRow[];
};

export type IImportResult = {
  batchId: string;
  summary: IImportSummary;
} & IImportReport;

export type IImportIssueSeverity = 'rejected' | 'updated' | 'skipped';

export type IImportIssueRow = {
  line: number;
  sku?: string;
  name?: string;
  severity: IImportIssueSeverity;
  message: string;
};

export type IImportBatchStatus = 'processing' | 'completed' | 'failed';

export type IImportBatch = {
  id: string;
  filename: string;
  status: IImportBatchStatus;
  totalRows: number;
  inserted: number;
  updated: number;
  unchanged: number;
  rejected: number;
  skippedEmpty: number;
  importedBy: string | null;
  createdAt: string;
};

export type IImportBatchDetail = IImportBatch & {
  report: IImportReport;
};

export type IImportBatchListParams = {
  page: number;
  limit: number;
  q?: string;
};
