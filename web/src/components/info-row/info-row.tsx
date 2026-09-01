import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export type InfoRowProps = {
  label: string;
  value?: React.ReactNode;
};

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 'fontWeightMedium', textAlign: 'right' }}>
        {value ?? '—'}
      </Typography>
    </Stack>
  );
}
