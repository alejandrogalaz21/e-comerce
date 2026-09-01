import Chip from '@mui/material/Chip';

export type StatusChipProps = {
  loading: boolean;
  ok?: boolean;
};

export function StatusChip({ loading, ok }: StatusChipProps) {
  if (loading) {
    return <Chip size="small" color="default" label="Checking..." />;
  }
  return ok ? (
    <Chip size="small" color="success" label="Online" />
  ) : (
    <Chip size="small" color="error" label="Offline" />
  );
}
