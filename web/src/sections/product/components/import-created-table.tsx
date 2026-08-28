import type { IImportCreatedRow } from 'src/types/product';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import CardHeader from '@mui/material/CardHeader';
import TableContainer from '@mui/material/TableContainer';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

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
        <TableContainer sx={{ minWidth: 480 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 80 }}>Line</TableCell>
                <TableCell sx={{ width: 160 }}>SKU</TableCell>
                <TableCell>Product name</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.line}-${row.sku}`}>
                  <TableCell>{row.line}</TableCell>
                  <TableCell>{row.sku}</TableCell>
                  <TableCell>{row.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Scrollbar>
    </Card>
  );
}
