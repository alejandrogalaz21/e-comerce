import type { IImportRejectedRow } from 'src/types/product';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import CardHeader from '@mui/material/CardHeader';
import TableContainer from '@mui/material/TableContainer';

import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Props = {
  rows: IImportRejectedRow[];
};

export function ImportRejectedTable({ rows }: Props) {
  return (
    <Card>
      <CardHeader title={`Rejected rows (${rows.length})`} sx={{ mb: 2 }} />

      <Scrollbar>
        <TableContainer sx={{ minWidth: 480 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 80 }}>Line</TableCell>
                <TableCell sx={{ width: 160 }}>SKU</TableCell>
                <TableCell>Errors</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.line}>
                  <TableCell>{row.line}</TableCell>
                  <TableCell>{row.sku ?? '—'}</TableCell>
                  <TableCell>{row.errors.join(', ')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Scrollbar>
    </Card>
  );
}
