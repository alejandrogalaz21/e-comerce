import { useQuery } from '@tanstack/react-query';

import { getDbStatus, getApiHealth, getRedisStatus } from 'src/actions/status';

// ----------------------------------------------------------------------

const REFRESH_INTERVAL_MS = 5000;

export const statusKeys = {
  all: ['status'] as const,
  health: () => [...statusKeys.all, 'health'] as const,
  db: () => [...statusKeys.all, 'db'] as const,
  redis: () => [...statusKeys.all, 'redis'] as const,
};

// ----------------------------------------------------------------------

export function useApiHealth() {
  return useQuery({
    queryKey: statusKeys.health(),
    queryFn: getApiHealth,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}

export function useDbStatus() {
  return useQuery({
    queryKey: statusKeys.db(),
    queryFn: getDbStatus,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}

export function useRedisStatus() {
  return useQuery({
    queryKey: statusKeys.redis(),
    queryFn: getRedisStatus,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}
