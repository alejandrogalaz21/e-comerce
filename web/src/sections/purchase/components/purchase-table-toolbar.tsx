import type { IPurchaseStatus } from 'src/types/purchase';

import { useState, useEffect, useCallback } from 'react';

import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';
import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

import { hasInvertedRange, PURCHASE_STATUSES, hasPurchaseFilters } from '../purchase-params';

import type { IPurchaseFilters } from '../purchase-params';

type Props = {
  state: IPurchaseFilters;
  totalResults: number;
  onApply: (changes: Partial<IPurchaseFilters>) => void;
  onReset: () => void;
};

export function PurchaseTableToolbar({ state, totalResults, onApply, onReset }: Props) {
  // Kept local while typing, so every keystroke does not become a history entry.
  const [term, setTerm] = useState(state.q);

  useEffect(() => setTerm(state.q), [state.q]);

  const hasFilters = hasPurchaseFilters(state);
  const inverted = hasInvertedRange(state);

  const handleClearSearch = useCallback(() => {
    setTerm('');
    onApply({ q: '' });
  }, [onApply]);

  return (
    <Stack spacing={2} sx={{ p: 2.5 }}>
      <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }}>
        <TextField
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onApply({ q: term.trim() });
          }}
          placeholder="Order id, delivery details, SKU or product, then Enter..."
          inputProps={{ 'aria-label': 'Search orders' }}
          sx={{ width: { xs: 1, md: 320 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          select
          label="Status"
          value={state.status}
          onChange={(event) => onApply({ status: event.target.value as IPurchaseStatus | '' })}
          sx={{ width: { xs: 1, md: 160 } }}
        >
          <MenuItem value="">All</MenuItem>
          {PURCHASE_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {status}
            </MenuItem>
          ))}
        </TextField>

        {/* The pickers bound each other, so an inverted range takes deliberate
            typing; `inverted` is what catches that case. */}
        <TextField
          type="date"
          label="From"
          value={state.dateFrom}
          onChange={(event) => onApply({ dateFrom: event.target.value })}
          InputLabelProps={{ shrink: true }}
          inputProps={{ max: state.dateTo || undefined }}
          error={inverted}
          sx={{ width: { xs: 1, md: 170 } }}
        />

        <TextField
          type="date"
          label="To"
          value={state.dateTo}
          onChange={(event) => onApply({ dateTo: event.target.value })}
          InputLabelProps={{ shrink: true }}
          inputProps={{ min: state.dateFrom || undefined }}
          error={inverted}
          helperText={inverted ? 'To must not be earlier than From' : undefined}
          FormHelperTextProps={{ sx: { position: 'absolute', top: '100%', m: 0 } }}
          sx={{ width: { xs: 1, md: 170 } }}
        />
      </Stack>

      {hasFilters && (
        <FiltersResult totalResults={totalResults} onReset={onReset}>
          <FiltersBlock label="Search:" isShow={!!state.q}>
            <Chip {...chipProps} label={state.q} onDelete={handleClearSearch} />
          </FiltersBlock>

          <FiltersBlock label="Status:" isShow={!!state.status}>
            <Chip {...chipProps} label={state.status} onDelete={() => onApply({ status: '' })} />
          </FiltersBlock>

          <FiltersBlock label="Date:" isShow={!!(state.dateFrom || state.dateTo)}>
            <Chip
              {...chipProps}
              label={`${state.dateFrom || 'any'} to ${state.dateTo || 'any'}`}
              onDelete={() => onApply({ dateFrom: '', dateTo: '' })}
            />
          </FiltersBlock>
        </FiltersResult>
      )}
    </Stack>
  );
}
