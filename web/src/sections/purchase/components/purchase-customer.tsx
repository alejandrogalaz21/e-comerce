import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

type Props = {
  value: string;
};

/**
 * A delivery detail as the order recorded it. Orders placed before deliveries
 * were recorded have none, and the dash says so rather than leaving a cell that
 * reads as a failed load.
 */
export function PurchaseText({ value }: Props) {
  if (!value) {
    return (
      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
        —
      </Typography>
    );
  }

  return (
    <Tooltip title={value}>
      <Typography variant="body2" noWrap>
        {value}
      </Typography>
    </Tooltip>
  );
}
