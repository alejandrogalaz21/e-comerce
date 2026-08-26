import type { InfoRowProps } from 'src/components/info-row';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import { InfoRow } from 'src/components/info-row';

import { StatusChip } from './status-chip';

// ----------------------------------------------------------------------

export type ServiceStatusCardProps = {
  title: string;
  subheader: string;
  loading: boolean;
  ok?: boolean;
  rows: InfoRowProps[];
  error?: string;
};

export function ServiceStatusCard({
  title,
  subheader,
  loading,
  ok,
  rows,
  error,
}: ServiceStatusCardProps) {
  return (
    <Card>
      <CardHeader
        title={title}
        subheader={subheader}
        action={<StatusChip loading={loading} ok={ok} />}
      />
      <CardContent>
        <Stack spacing={1.5} divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />}>
          {rows.map((row) => (
            <InfoRow key={row.label} label={row.label} value={row.value} />
          ))}
          {!!error && <InfoRow label="Error" value={error} />}
        </Stack>
      </CardContent>
    </Card>
  );
}
