// ----------------------------------------------------------------------

export type IServiceStatus = {
  source: 'redis' | 'postgres';
  ok: boolean;
  latencyMs: number;
  data?: Record<string, unknown>;
  error?: string;
};

export type IRedisStatusData = {
  visits: number;
  pong: string;
  version: string;
  lastCheck: string;
};

export type IDbStatusData = {
  now: string;
  database: string;
  version: string;
  productCount: number;
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
