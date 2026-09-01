import type { GridColDef, GridColumnVisibilityModel } from '@mui/x-data-grid';

import { useMemo, useCallback } from 'react';

import { useLocalStorage } from 'src/hooks/use-local-storage';

const STORAGE_KEY = 'product-list-columns';

type StoredColumnState = {
  widths: Record<string, number>;
  visibility: GridColumnVisibilityModel;
};

const initialState: StoredColumnState = {
  widths: {},
  visibility: { weightKg: false, createdAt: false },
};

export function useProductListColumns(columns: GridColDef[]) {
  const { state, setState, resetState, canReset } = useLocalStorage<StoredColumnState>(
    STORAGE_KEY,
    initialState
  );

  const sizedColumns = useMemo(
    () =>
      columns.map((column) => {
        const storedWidth = state.widths[column.field];

        if (!storedWidth) return column;

        return { ...column, width: storedWidth, flex: undefined };
      }),
    [columns, state.widths]
  );

  const onColumnWidthChange = useCallback(
    ({ colDef, width }: { colDef: GridColDef; width: number }) => {
      setState({ widths: { ...state.widths, [colDef.field]: width } });
    },
    [setState, state.widths]
  );

  const onColumnVisibilityModelChange = useCallback(
    (visibility: GridColumnVisibilityModel) => {
      setState({ visibility });
    },
    [setState]
  );

  return {
    columns: sizedColumns,
    columnVisibilityModel: state.visibility,
    onColumnWidthChange,
    onColumnVisibilityModelChange,
    resetColumns: resetState,
    columnsCustomized: canReset,
  };
}
