import type { IApiHealth, IServiceStatus } from 'src/types/status';

import axiosInstance, { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export async function getApiHealth(): Promise<IApiHealth> {
  const res = await axiosInstance.get<IApiHealth>(endpoints.status.health);
  return res.data;
}

export async function getDbStatus(): Promise<IServiceStatus> {
  const res = await axiosInstance.get<IServiceStatus>(endpoints.status.db);
  return res.data;
}

export async function getRedisStatus(): Promise<IServiceStatus> {
  const res = await axiosInstance.get<IServiceStatus>(endpoints.status.redis);
  return res.data;
}
