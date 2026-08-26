import { useQuery, keepPreviousData } from '@tanstack/react-query';

import { getProduct, getProducts, searchProducts } from 'src/actions/product';

// ----------------------------------------------------------------------

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
  search: (query: string) => [...productKeys.all, 'search', query] as const,
};

// ----------------------------------------------------------------------

export function useGetProducts() {
  const query = useQuery({
    queryKey: productKeys.lists(),
    queryFn: getProducts,
  });

  const products = query.data?.products ?? [];

  return {
    products,
    productsLoading: query.isLoading,
    productsError: query.error,
    productsValidating: query.isFetching,
    productsEmpty: !query.isLoading && !products.length,
  };
}

export function useGetProduct(productId: string) {
  const query = useQuery({
    queryKey: productKeys.detail(productId),
    queryFn: () => getProduct(productId),
    enabled: !!productId,
  });

  return {
    product: query.data?.product,
    productLoading: query.isLoading,
    productError: query.error,
    productValidating: query.isFetching,
  };
}

export function useSearchProducts(searchQuery: string) {
  const query = useQuery({
    queryKey: productKeys.search(searchQuery),
    queryFn: () => searchProducts(searchQuery),
    enabled: !!searchQuery,
    placeholderData: keepPreviousData,
  });

  const searchResults = query.data?.results ?? [];

  return {
    searchResults,
    searchLoading: query.isLoading,
    searchError: query.error,
    searchValidating: query.isFetching,
    searchEmpty: !query.isLoading && !searchResults.length,
  };
}
