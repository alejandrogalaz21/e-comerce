import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

type Props = {
  value: string;
};

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
