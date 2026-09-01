import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  visibleCount: number;
  totalCount: number;
  children?: ReactNode;
};

export function TableFilterBar({
  value,
  onChange,
  placeholder,
  label,
  visibleCount,
  totalCount,
  children,
}: Props) {
  return (
    <Stack
      spacing={1.5}
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ sm: 'center' }}
      sx={{ px: 3, pb: 2 }}
    >
      <TextField
        size="small"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputProps={{ 'aria-label': label }}
        sx={{ width: { xs: 1, sm: 320 } }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
          endAdornment: value ? (
            <InputAdornment position="end">
              <IconButton size="small" aria-label="Clear filter" onClick={() => onChange('')}>
                <Iconify icon="mingcute:close-line" width={18} />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
      />

      {children}

      <Box sx={{ typography: 'body2', color: 'text.secondary' }}>
        {`Showing ${visibleCount} of ${totalCount}`}
      </Box>
    </Stack>
  );
}
