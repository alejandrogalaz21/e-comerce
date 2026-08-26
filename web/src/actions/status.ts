import useSWR from 'swr';
import { useMemo } from 'react';

import { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

const swrOptions = {
  refreshInterval: 5000,
  revalidateOnFocus: true,
  shouldRetryOnError: true,
  errorRetryInterval: 5000,
};

// ----------------------------------------------------------------------

export type IServiceStatus = {
  source: string;
  ok: boolean;
  latencyMs: number;
  data?: Record<string, unknown>;
  error?: string;
};

export type IApiHealth = {
  app: {
    ok: boolean;
    name: string;
    version: string;
    env: string;
    status: string;
    startTime: string;
    uptimeMs: number;
    node: string;
  };
  postgres: {
    pgHealth: { ok: boolean; message: string; status: string };
    latencyMs: number;
  };
};

// ----------------------------------------------------------------------

export function useGetApiHealth() {
  const { data, isLoading, error } = useSWR<IApiHealth>(endpoints.status.health, fetcher, swrOptions);

  return useMemo(
    () => ({ health: data, healthLoading: isLoading, healthError: error }),
    [data, error, isLoading]
  );
}

export function useGetDbStatus() {
  const { data, isLoading, error } = useSWR<IServiceStatus>(endpoints.status.db, fetcher, swrOptions);

  return useMemo(
    () => ({ dbStatus: data, dbLoading: isLoading, dbError: error }),
    [data, error, isLoading]
  );
}

export function useGetRedisStatus() {
  const { data, isLoading, error } = useSWR<IServiceStatus>(endpoints.status.redis, fetcher, swrOptions);

  return useMemo(
    () => ({ redisStatus: data, redisLoading: isLoading, redisError: error }),
    [data, error, isLoading]
  );
}
