import type { IPurchaseItem } from 'src/types/purchase';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

import { useGetProduct } from 'src/sections/product/hooks/use-product';

import { priceComparison } from '../purchase-utils';

type Props = {
  items: IPurchaseItem[];
};

export function PurchaseDetailsItems({ items }: Props) {
  return (
    <Card>
      <CardHeader title="Items" subheader="Prices are the ones frozen when the order was placed" />

      <TableContainer sx={{ px: 3, pb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Name</TableCell>
              <TableCell align="center">Qty</TableCell>
              <TableCell align="right">Unit price</TableCell>
              <TableCell align="right">Subtotal</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {items.map((item) => (
              <PurchaseDetailsItemRow key={item.id} item={item} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

function PurchaseDetailsItemRow({ item }: { item: IPurchaseItem }) {
  const { product, productError } = useGetProduct(item.productId);

  const { changed: priceChanged, currentPrice } = priceComparison(
    item.unitPrice,
    productError ? undefined : product?.price
  );

  return (
    <TableRow>
      <TableCell sx={{ fontFamily: 'monospace' }}>{item.sku}</TableCell>

      <TableCell>
        <Link
          component={RouterLink}
          href={paths.product.details(item.productId)}
          color="inherit"
          underline="hover"
        >
          {item.name}
        </Link>
      </TableCell>

      <TableCell align="center">{item.quantity}</TableCell>

      <TableCell align="right">
        <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
          <Box component="span">{fCurrency(item.unitPrice)}</Box>

          {priceChanged && (
            <Tooltip
              title={`This product now costs ${fCurrency(currentPrice)}. The order keeps the price it was bought at.`}
            >
              <Box component="span" sx={{ display: 'inline-flex', color: 'warning.main' }}>
                <Iconify icon="solar:info-circle-bold" width={16} />
              </Box>
            </Tooltip>
          )}
        </Stack>

        {priceChanged && (
          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
            now {fCurrency(currentPrice)}
          </Typography>
        )}
      </TableCell>

      <TableCell align="right">{fCurrency(item.subtotal)}</TableCell>
    </TableRow>
  );
}
