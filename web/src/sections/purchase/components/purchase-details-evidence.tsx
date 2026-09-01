import type { IPurchase } from 'src/types/purchase';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { CopyableValue } from './copyable-value';
import { PurchaseStatusLabel } from './purchase-status-label';

type RowProps = {
  label: string;
  hint?: string;
  children: React.ReactNode;
};

function Row({ label, hint, children }: RowProps) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
        {label}
      </Typography>

      {children}

      {hint && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {hint}
        </Typography>
      )}
    </Stack>
  );
}

type Props = {
  purchase: IPurchase;
};

export function PurchaseDetailsEvidence({ purchase }: Props) {
  return (
    <Card>
      <CardHeader title="Order record" />

      <Stack spacing={2} sx={{ p: 3 }}>
        <Row label="Status">
          <Stack direction="row">
            <PurchaseStatusLabel status={purchase.status} />
          </Stack>
        </Row>

        <Row label="Placed at">
          <Typography variant="body2">{fDateTime(purchase.createdAt)}</Typography>
        </Row>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Row label="Order id">
          <CopyableValue value={purchase.id} label="Order id" />
        </Row>

        <Row
          label="Idempotency key"
          hint="Sending this key again returns this same order instead of charging twice."
        >
          <CopyableValue value={purchase.idempotencyKey} label="Idempotency key" />
        </Row>

        {purchase.paymentReference && (
          <Row label="Payment reference" hint="Returned by the simulated payment provider.">
            <CopyableValue value={purchase.paymentReference} label="Payment reference" />
          </Row>
        )}

        {purchase.status === 'FAILED' && purchase.declineReason && (
          <Row label="Decline reason">
            <Typography variant="body2" sx={{ color: 'error.main' }}>
              {purchase.declineReason}
            </Typography>
          </Row>
        )}
      </Stack>
    </Card>
  );
}
