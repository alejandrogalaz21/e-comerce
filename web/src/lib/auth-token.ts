export const ACCESS_TOKEN_KEY = 'jwt_access_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(accessToken: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (accessToken) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

type RequestConfigLike = { headers: Record<string, unknown> };

export function attachAccessToken<T extends RequestConfigLike>(config: T, token: string | null): T {
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}

export function shouldClearSessionOnUnauthorized(
  status: number | undefined,
  requestUrl: string | undefined,
  exemptUrls: readonly string[]
): boolean {
  if (status !== 401) {
    return false;
  }

  if (!requestUrl) {
    return true;
  }

  return !exemptUrls.some((url) => requestUrl.includes(url));
}

export function buildSignInHref(signInPath: string, returnTo: string): string {
  const params = new URLSearchParams({ returnTo });

  return `${signInPath}?${params.toString()}`;
}

export function safeReturnTo(returnTo: string | null, fallback: string): string {
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) {
    return fallback;
  }

  return returnTo;
}
