import type { ReactNode } from 'react';
import type { IProductCategory } from 'src/types/product';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Popover from '@mui/material/Popover';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';
import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

import { isPriceRangeValid } from '../product-list-params';

import type { IProductListState } from '../product-list-params';

// ----------------------------------------------------------------------

type Props = {
  state: IProductListState;
  totalResults: number;
  categories: IProductCategory[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onApply: (changes: Partial<IProductListState>) => void;
  onReset: () => void;
  /**
   * Controls that act on the grid itself. They live here rather than in a band of
   * their own, and they must render inside the grid toolbar slot to reach its apiRef.
   */
  gridControls?: ReactNode;
};

export function ProductFiltersToolbar({
  state,
  totalResults,
  categories,
  searchTerm,
  onSearchChange,
  onApply,
  onReset,
  gridControls,
}: Props) {
  const hasFilters =
    !!state.q.length ||
    !!state.category.length ||
    state.minPrice !== undefined ||
    state.maxPrice !== undefined ||
    state.inStock !== undefined;

  const handleRemoveTerm = useCallback(
    (value: string) => {
      onApply({ q: state.q.filter((term) => term !== value) });
    },
    [onApply, state.q]
  );

  const handleSubmitTerm = useCallback(() => {
    const term = searchTerm.trim();

    if (!term || state.q.includes(term)) {
      onSearchChange('');
      return;
    }

    onApply({ q: [...state.q, term] });
    onSearchChange('');
  }, [onApply, onSearchChange, searchTerm, state.q]);

  const handleRemoveCategory = useCallback(
    (value: string) => {
      onApply({ category: state.category.filter((item) => item !== value) });
    },
    [onApply, state.category]
  );

  const renderSearch = (
    <TextField
      size="small"
      value={searchTerm}
      onChange={(event) => onSearchChange(event.target.value)}
      placeholder="Search and press Enter..."
      inputProps={{ 'aria-label': 'Search products' }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          handleSubmitTerm();
        }
      }}
      sx={{ width: { xs: 1, sm: 260 } }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
          </InputAdornment>
        ),
        endAdornment: searchTerm ? (
          <InputAdornment position="end">
            <IconButton size="small" aria-label="Clear search" onClick={() => onSearchChange('')}>
              <Iconify icon="mingcute:close-line" width={18} />
            </IconButton>
          </InputAdornment>
        ) : null,
      }}
    />
  );

  const renderCategory = (
    <FormControl size="small" sx={{ width: { xs: 1, sm: 200 } }}>
      <InputLabel id="product-category-filter">Category</InputLabel>
      <Select
        multiple
        labelId="product-category-filter"
        label="Category"
        value={state.category}
        onChange={(event) =>
          onApply({
            category:
              typeof event.target.value === 'string'
                ? event.target.value.split(',')
                : event.target.value,
          })
        }
        renderValue={(selected) => selected.join(', ')}
      >
        {categories.map((option) => (
          <MenuItem key={option.category} value={option.category}>
            <Checkbox
              disableRipple
              size="small"
              checked={state.category.includes(option.category)}
            />
            <ListItemText primary={option.category} secondary={`${option.count}`} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const renderStock = (
    <FormControl size="small" sx={{ width: { xs: 1, sm: 150 } }}>
      <InputLabel id="product-stock-filter">Availability</InputLabel>
      <Select
        labelId="product-stock-filter"
        label="Availability"
        value={state.inStock === undefined ? '' : String(state.inStock)}
        onChange={(event) =>
          onApply({
            inStock: event.target.value === '' ? undefined : event.target.value === 'true',
          })
        }
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="true">In stock</MenuItem>
        <MenuItem value="false">Sold out</MenuItem>
      </Select>
    </FormControl>
  );

  return (
    <Stack spacing={1.5} sx={{ p: 2.5, pb: hasFilters ? 0 : 2.5 }}>
      <Stack
        spacing={1.5}
        alignItems={{ sm: 'center' }}
        direction={{ xs: 'column', sm: 'row' }}
        flexWrap="wrap"
      >
        {renderSearch}
        {renderCategory}
        <PriceRangeFilter state={state} onApply={onApply} />
        {renderStock}

        {gridControls && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: { sm: 'auto' } }}>
            {gridControls}
          </Stack>
        )}
      </Stack>

      {hasFilters && (
        <FiltersResult totalResults={totalResults} onReset={onReset}>
          <FiltersBlock label="Search:" isShow={!!state.q.length}>
            {state.q.map((term) => (
              <Chip
                {...chipProps}
                key={term}
                label={term}
                onDelete={() => handleRemoveTerm(term)}
              />
            ))}
          </FiltersBlock>

          <FiltersBlock label="Category:" isShow={!!state.category.length}>
            {state.category.map((value) => (
              <Chip
                {...chipProps}
                key={value}
                label={value}
                onDelete={() => handleRemoveCategory(value)}
              />
            ))}
          </FiltersBlock>

          <FiltersBlock
            label="Price:"
            isShow={state.minPrice !== undefined || state.maxPrice !== undefined}
          >
            <Chip
              {...chipProps}
              label={priceRangeLabel(state.minPrice, state.maxPrice)}
              onDelete={() => onApply({ minPrice: undefined, maxPrice: undefined })}
            />
          </FiltersBlock>

          <FiltersBlock label="Availability:" isShow={state.inStock !== undefined}>
            <Chip
              {...chipProps}
              label={state.inStock ? 'In stock' : 'Sold out'}
              onDelete={() => onApply({ inStock: undefined })}
            />
          </FiltersBlock>
        </FiltersResult>
      )}
    </Stack>
  );
}

// ----------------------------------------------------------------------

function priceRangeLabel(minPrice?: number, maxPrice?: number): string {
  if (minPrice !== undefined && maxPrice !== undefined) return `${minPrice} - ${maxPrice}`;
  if (minPrice !== undefined) return `from ${minPrice}`;
  return `up to ${maxPrice}`;
}

type PriceRangeProps = {
  state: IProductListState;
  onApply: (changes: Partial<IProductListState>) => void;
};

function PriceRangeFilter({ state, onApply }: PriceRangeProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  useEffect(() => {
    setMin(state.minPrice === undefined ? '' : String(state.minPrice));
    setMax(state.maxPrice === undefined ? '' : String(state.maxPrice));
  }, [state.minPrice, state.maxPrice]);

  const parsed = {
    minPrice: min.trim() === '' ? undefined : Number(min),
    maxPrice: max.trim() === '' ? undefined : Number(max),
  };

  const hasInvalidNumber =
    (parsed.minPrice !== undefined && !(Number.isFinite(parsed.minPrice) && parsed.minPrice >= 0)) ||
    (parsed.maxPrice !== undefined && !(Number.isFinite(parsed.maxPrice) && parsed.maxPrice >= 0));

  const rangeIsInverted = !hasInvalidNumber && !isPriceRangeValid(parsed.minPrice, parsed.maxPrice);

  const canApply = !hasInvalidNumber && !rangeIsInverted;

  const handleApply = () => {
    if (!canApply) return;
    onApply(parsed);
    setAnchorEl(null);
  };

  const label =
    state.minPrice !== undefined || state.maxPrice !== undefined
      ? priceRangeLabel(state.minPrice, state.maxPrice)
      : 'Price';

  return (
    <>
      <Button
        color="inherit"
        variant="outlined"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        endIcon={<Iconify icon="eva:chevron-down-fill" />}
        sx={{ height: 40, typography: 'body2', fontWeight: 'fontWeightMedium' }}
      >
        {label}
      </Button>

      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, width: 260 }}>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              label="Min"
              type="number"
              value={min}
              onChange={(event) => setMin(event.target.value)}
              inputProps={{ min: 0, 'aria-label': 'Minimum price' }}
            />
            <TextField
              size="small"
              label="Max"
              type="number"
              value={max}
              onChange={(event) => setMax(event.target.value)}
              error={rangeIsInverted}
              helperText={rangeIsInverted ? 'Max must not be lower than min' : ''}
              inputProps={{ min: 0, 'aria-label': 'Maximum price' }}
            />
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button
              size="small"
              color="inherit"
              onClick={() => {
                onApply({ minPrice: undefined, maxPrice: undefined });
                setAnchorEl(null);
              }}
            >
              Clear
            </Button>
            <Button size="small" variant="contained" disabled={!canApply} onClick={handleApply}>
              Apply
            </Button>
          </Stack>
        </Box>
      </Popover>
    </>
  );
}
