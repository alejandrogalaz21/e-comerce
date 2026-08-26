import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fDateTime } from 'src/utils/format-time';

import { CONFIG } from 'src/config-global';
import { useGetDbStatus, useGetApiHealth, useGetRedisStatus } from 'src/actions/status';

// ----------------------------------------------------------------------

type StatusChipProps = {
  loading: boolean;
  ok?: boolean;
};

function StatusChip({ loading, ok }: StatusChipProps) {
  if (loading) {
    return <Chip size="small" color="default" label="Checking..." />;
  }
  return ok ? (
    <Chip size="small" color="success" label="Online" />
  ) : (
    <Chip size="small" color="error" label="Offline" />
  );
}

// ----------------------------------------------------------------------

type InfoRowProps = {
  label: string;
  value?: React.ReactNode;
};

function InfoRow({ label, value }: InfoRowProps) {
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

// ----------------------------------------------------------------------

export function StatusView() {
  const { health, healthLoading, healthError } = useGetApiHealth();
  const { dbStatus, dbLoading } = useGetDbStatus();
  const { redisStatus, redisLoading } = useGetRedisStatus();

  const apiOk = !healthError && !!health?.app?.ok;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
      <Typography variant="h3" sx={{ mb: 1 }}>
        System status
      </Typography>

      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 5 }}>
        Live status of every piece of the stack, showing the real source of each value. Refreshes
        every 5 seconds.
      </Typography>

      <Box
        gap={3}
        display="grid"
        gridTemplateColumns={{ xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' }}
      >
        <Card>
          <CardHeader
            title="Frontend (web)"
            subheader="Build-time configuration of this SPA"
            action={<Chip size="small" color="success" label="Online" />}
          />
          <CardContent>
            <Stack spacing={1.5} divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />}>
              <InfoRow label="App version" value={CONFIG.site.version} />
              <InfoRow label="API server URL" value={CONFIG.site.serverUrl || '(mismo origen)'} />
              <InfoRow label="Base path" value={CONFIG.site.basePath || '/'} />
              <InfoRow label="Auth method" value={CONFIG.auth.method} />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="API (NestJS)"
            subheader="GET /api/v1/health"
            action={<StatusChip loading={healthLoading} ok={apiOk} />}
          />
          <CardContent>
            <Stack spacing={1.5} divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />}>
              <InfoRow label="Name" value={health?.app?.name} />
              <InfoRow label="Version" value={health?.app?.version} />
              <InfoRow label="Environment" value={health?.app?.env} />
              <InfoRow label="Node" value={health?.app?.node} />
              <InfoRow
                label="Uptime"
                value={health ? `${Math.round(health.app.uptimeMs / 1000)} s` : undefined}
              />
              <InfoRow
                label="Started at"
                value={health ? fDateTime(health.app.startTime) : undefined}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="PostgreSQL"
            subheader="GET /api/v1/status/db — data read from the database"
            action={<StatusChip loading={dbLoading} ok={dbStatus?.ok} />}
          />
          <CardContent>
            <Stack spacing={1.5} divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />}>
              <InfoRow label="Database" value={dbStatus?.data?.database as string} />
              <InfoRow label="Server version" value={dbStatus?.data?.version as string} />
              <InfoRow label="Products in DB" value={dbStatus?.data?.productCount as number} />
              <InfoRow
                label="DB time (NOW())"
                value={dbStatus?.data?.now ? fDateTime(dbStatus.data.now as string) : undefined}
              />
              <InfoRow
                label="Latency"
                value={dbStatus ? `${dbStatus.latencyMs} ms` : undefined}
              />
              {!!dbStatus?.error && <InfoRow label="Error" value={dbStatus.error} />}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Redis"
            subheader="GET /api/v1/status/redis — data written to and read from Redis"
            action={<StatusChip loading={redisLoading} ok={redisStatus?.ok} />}
          />
          <CardContent>
            <Stack spacing={1.5} divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />}>
              <InfoRow label="Ping" value={redisStatus?.data?.pong as string} />
              <InfoRow label="Server version" value={redisStatus?.data?.version as string} />
              <InfoRow
                label="Visits counter (INCR)"
                value={redisStatus?.data?.visits as number}
              />
              <InfoRow
                label="Last check (SET/GET)"
                value={
                  redisStatus?.data?.lastCheck
                    ? fDateTime(redisStatus.data.lastCheck as string)
                    : undefined
                }
              />
              <InfoRow
                label="Latency"
                value={redisStatus ? `${redisStatus.latencyMs} ms` : undefined}
              />
              {!!redisStatus?.error && <InfoRow label="Error" value={redisStatus.error} />}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
