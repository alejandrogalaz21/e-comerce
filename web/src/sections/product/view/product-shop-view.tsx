import type { IProductItem, IProductCategory } from 'src/types/product';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { ProductList } from '../product-list';
import { categoryIcon } from '../category-icon';
import { SHOP_PAGE_SIZE } from '../shop-params';
import { useShopParams } from '../hooks/use-shop-params';

// ----------------------------------------------------------------------

const MAX_CATEGORY_CHIPS = 8;

type Props = {
  products: IProductItem[];
  categories: IProductCategory[];
  total: number;
  loading?: boolean;
};

export function ProductShopView({ products, categories, total, loading }: Props) {
  const { state, apply } = useShopParams();

  // Kept local while typing, so every keystroke does not become a history entry.
  const [term, setTerm] = useState(state.q);

  useEffect(() => setTerm(state.q), [state.q]);

  const pageCount = Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));

  const visibleCategories = useMemo(
    () => [...categories].sort((a, b) => b.count - a.count).slice(0, MAX_CATEGORY_CHIPS),
    [categories]
  );

  const nothingFound = !loading && !products.length;

  const renderSearch = (
    <TextField
      value={term}
      onChange={(event) => setTerm(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') apply({ q: term.trim() });
      }}
      placeholder="Search the catalog and press Enter..."
      inputProps={{ 'aria-label': 'Search products' }}
      sx={{ width: { xs: 1, sm: 420 } }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
          </InputAdornment>
        ),
        endAdornment: term ? (
          <InputAdornment position="end">
            <IconButton
              size="small"
              aria-label="Clear search"
              onClick={() => {
                setTerm('');
                apply({ q: '' });
              }}
            >
              <Iconify icon="mingcute:close-line" width={18} />
            </IconButton>
          </InputAdornment>
        ) : null,
      }}
    />
  );

  const renderCategories = (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <Chip
        label="All"
        color={state.category ? 'default' : 'primary'}
        variant={state.category ? 'outlined' : 'filled'}
        onClick={() => apply({ category: '' })}
      />

      {visibleCategories.map((item) => {
        const selected = state.category === item.category;

        return (
          <Chip
            key={item.category}
            label={`${item.category} (${item.count})`}
            icon={<Iconify icon={categoryIcon(item.category)} width={18} />}
            color={selected ? 'primary' : 'default'}
            variant={selected ? 'filled' : 'outlined'}
            onClick={() => apply({ category: selected ? '' : item.category })}
          />
        );
      })}
    </Stack>
  );

  return (
    <Container sx={{ mb: 15 }}>
      <Stack spacing={1} sx={{ my: { xs: 3, md: 5 } }}>
        <Typography variant="h3">Shop</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {loading ? 'Loading the catalog...' : `${total} products available`}
        </Typography>
      </Stack>

      <Stack spacing={2.5} sx={{ mb: 4 }}>
        {renderSearch}
        {renderCategories}
      </Stack>

      {nothingFound ? (
        <EmptyContent
          filled
          sx={{ py: 10 }}
          title={
            state.q ? `No results for "${state.q}"` : 'No products match the selected category'
          }
        />
      ) : (
        <ProductList products={products} loading={loading} />
      )}

      {pageCount > 1 && (
        <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            page={state.page}
            count={pageCount}
            onChange={(_event, page) => apply({ page })}
          />
        </Box>
      )}
    </Container>
  );
}
