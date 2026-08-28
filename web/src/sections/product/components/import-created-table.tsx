import type { IImportCreatedRow } from 'src/types/product';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import CardHeader from '@mui/material/CardHeader';
import TableContainer from '@mui/material/TableContainer';

import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const EMPTY = '—';

type Props = {
  rows: IImportCreatedRow[];
};

export function ImportCreatedTable({ rows }: Props) {
  return (
    <Card data-testid="import-created">
      <CardHeader
        title={`Created rows (${rows.length})`}
        subheader="New products inserted into the catalog by this import"
        action={
          <Label
            variant="soft"
            color="success"
            startIcon={<Iconify icon="solar:add-circle-bold-duotone" />}
          >
            {`${rows.length} created`}
          </Label>
        }
        sx={{ mb: 2 }}
      />

      <Scrollbar sx={{ maxHeight: 420 }}>
        <TableContainer sx={{ minWidth: 960 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 70 }}>Line</TableCell>
                <TableCell sx={{ width: 140 }}>SKU</TableCell>
                <TableCell sx={{ minWidth: 180 }}>Name</TableCell>
                <TableCell sx={{ width: 150 }}>Category</TableCell>
                <TableCell align="right" sx={{ width: 110 }}>
                  Price
                </TableCell>
                <TableCell align="right" sx={{ width: 90 }}>
                  Stock
                </TableCell>
                <TableCell align="right" sx={{ width: 110 }}>
                  Weight (kg)
                </TableCell>
                <TableCell sx={{ minWidth: 220 }}>Description</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.line}-${row.sku}`}>
                  <TableCell>{row.line}</TableCell>
                  <TableCell>{row.sku}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.category ?? EMPTY}</TableCell>
                  <TableCell align="right">
                    {row.price === undefined ? EMPTY : fCurrency(Number(row.price))}
                  </TableCell>
                  <TableCell align="right">{row.stock ?? EMPTY}</TableCell>
                  <TableCell align="right">{row.weightKg ?? EMPTY}</TableCell>
                  <TableCell
                    sx={{
                      maxWidth: 320,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      color: 'text.secondary',
                    }}
                  >
                    {row.description ? (
                      <Tooltip title={row.description} placement="top-start">
                        <span>{row.description}</span>
                      </Tooltip>
                    ) : (
                      EMPTY
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Scrollbar>
    </Card>
  );
}
