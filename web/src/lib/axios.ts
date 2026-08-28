import type { AxiosError, AxiosRequestConfig } from 'axios';

import axios from 'axios';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/config-global';

import {
  getAccessToken,
  setAccessToken,
  buildSignInHref,
  attachAccessToken,
  shouldClearSessionOnUnauthorized,
} from './auth-token';

// ----------------------------------------------------------------------

const authEndpoints = {
  me: '/api/v1/auth/me',
  signIn: '/api/v1/auth/sign-in',
  signUp: '/api/v1/auth/sign-up',
};

const axiosInstance = axios.create({ baseURL: CONFIG.site.serverUrl });

axiosInstance.interceptors.request.use((config) => attachAccessToken(config, getAccessToken()));

function redirectToSignIn() {
  if (typeof window === 'undefined') {
    return;
  }

  const { pathname, search } = window.location;

  // The public shop must never be pushed to login by a stale token.
  if (!pathname.startsWith(paths.dashboard.root)) {
    return;
  }

  window.location.href = buildSignInHref(paths.auth.jwt.signIn, `${pathname}${search}`);
}

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const exemptUrls = [authEndpoints.signIn, authEndpoints.signUp];

    if (shouldClearSessionOnUnauthorized(error.response?.status, error.config?.url, exemptUrls)) {
      setAccessToken(null);
      redirectToSignIn();
    }

    return Promise.reject((error.response && error.response.data) || 'Something went wrong!');
  }
);

export default axiosInstance;

// ----------------------------------------------------------------------

export const fetcher = async (args: string | [string, AxiosRequestConfig]) => {
  try {
    const [url, config] = Array.isArray(args) ? args : [args];

    const res = await axiosInstance.get(url, { ...config });

    return res.data;
  } catch (error) {
    console.error('Failed to fetch:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------

export const endpoints = {
  status: {
    health: '/api/v1/health',
    db: '/api/v1/status/db',
    redis: '/api/v1/status/redis',
  },
  auth: authEndpoints,
  product: {
    list: '/api/v1/products',
    categories: '/api/v1/products/categories',
    details: (id: string) => `/api/v1/products/${id}`,
    create: '/api/v1/products',
    import: '/api/v1/products/import',
    batches: {
      list: '/api/v1/products/import/batches',
      details: (id: string) => `/api/v1/products/import/batches/${id}`,
    },
    update: (id: string) => `/api/v1/products/${id}`,
    delete: (id: string) => `/api/v1/products/${id}`,
  },
};
