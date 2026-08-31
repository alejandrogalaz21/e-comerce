import type { LabelColor } from 'src/components/label';
import type { IPurchaseStatus } from 'src/types/purchase';

import Tooltip from '@mui/material/Tooltip';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

const STATUS_COLOR: Record<IPurchaseStatus, LabelColor> = {
  PAID: 'success',
  FAILED: 'error',
  PENDING: 'warning',
};

type Props = {
  status: IPurchaseStatus;
  declineReason?: string | null;
};

export function PurchaseStatusLabel({ status, declineReason }: Props) {
  const label = (
    <Label variant="soft" color={STATUS_COLOR[status] ?? 'default'}>
      {status}
    </Label>
  );

  // Why an order failed is the first thing anyone asks; the tooltip answers it
  // without opening the order. A paid one has nothing to explain.
  if (status !== 'FAILED' || !declineReason) return label;

  return (
    <Tooltip title={declineReason}>
      <span>{label}</span>
    </Tooltip>
  );
}
