import type { IDbStatusData, IRedisStatusData } from 'src/types/status';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { CONFIG } from 'src/config-global';
import { DashboardContent } from 'src/layouts/dashboard';

import { ServiceStatusCard } from '../components';
import { useDbStatus, useApiHealth, useRedisStatus } from '../hooks/use-status';

// ----------------------------------------------------------------------

export function StatusView() {
  const apiHealth = useApiHealth();
  const dbStatus = useDbStatus();
  const redisStatus = useRedisStatus();

  const health = apiHealth.data;
  const db = dbStatus.data;
  const dbData = db?.data as IDbStatusData | undefined;
  const redis = redisStatus.data;
  const redisData = redis?.data as IRedisStatusData | undefined;

  return (
    <DashboardContent maxWidth="lg">
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
        <ServiceStatusCard
          title="Frontend (web)"
          subheader="Build-time configuration of this SPA"
          loading={false}
          ok
          rows={[
            { label: 'App version', value: CONFIG.site.version },
            { label: 'API server URL', value: CONFIG.site.serverUrl || '(same origin)' },
            { label: 'Base path', value: CONFIG.site.basePath || '/' },
            { label: 'Auth method', value: CONFIG.auth.method },
          ]}
        />

        <ServiceStatusCard
          title="API (NestJS)"
          subheader="GET /api/v1/health"
          loading={apiHealth.isLoading}
          ok={!apiHealth.isError && !!health?.app?.ok}
          rows={[
            { label: 'Name', value: health?.app?.name },
            { label: 'Version', value: health?.app?.version },
            { label: 'Environment', value: health?.app?.env },
            { label: 'Node', value: health?.app?.node },
            {
              label: 'Uptime',
              value: health ? `${Math.round(health.app.uptimeMs / 1000)} s` : undefined,
            },
            { label: 'Started at', value: health ? fDateTime(health.app.startTime) : undefined },
          ]}
        />

        <ServiceStatusCard
          title="PostgreSQL"
          subheader="GET /api/v1/status/db — data read from the database"
          loading={dbStatus.isLoading}
          ok={db?.ok}
          error={db?.error}
          rows={[
            { label: 'Database', value: dbData?.database },
            { label: 'Server version', value: dbData?.version },
            { label: 'Products in DB', value: dbData?.productCount },
            { label: 'DB time (NOW())', value: dbData ? fDateTime(dbData.now) : undefined },
            { label: 'Latency', value: db ? `${db.latencyMs} ms` : undefined },
          ]}
        />

        <ServiceStatusCard
          title="Redis"
          subheader="GET /api/v1/status/redis — data written to and read from Redis"
          loading={redisStatus.isLoading}
          ok={redis?.ok}
          error={redis?.error}
          rows={[
            { label: 'Ping', value: redisData?.pong },
            { label: 'Server version', value: redisData?.version },
            { label: 'Visits counter (INCR)', value: redisData?.visits },
            {
              label: 'Last check (SET/GET)',
              value: redisData ? fDateTime(redisData.lastCheck) : undefined,
            },
            { label: 'Latency', value: redis ? `${redis.latencyMs} ms` : undefined },
          ]}
        />
      </Box>
    </DashboardContent>
  );
}
