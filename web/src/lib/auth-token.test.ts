import { it, expect, describe } from 'vitest';

import {
  safeReturnTo,
  buildSignInHref,
  attachAccessToken,
  shouldClearSessionOnUnauthorized,
} from './auth-token';

describe('attachAccessToken', () => {
  it('attaches the bearer header when a token is stored', () => {
    const config = attachAccessToken({ headers: {} as Record<string, unknown> }, 'abc.def.ghi');

    expect(config.headers.Authorization).toBe('Bearer abc.def.ghi');
  });

  it('leaves the headers untouched when there is no token', () => {
    const config = attachAccessToken({ headers: {} as Record<string, unknown> }, null);

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('does not overwrite other headers', () => {
    const config = attachAccessToken({ headers: { 'Content-Type': 'application/json' } }, 'token');

    expect(config.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    });
  });
});

describe('shouldClearSessionOnUnauthorized', () => {
  const exempt = ['/api/v1/auth/sign-in', '/api/v1/auth/sign-up'];

  it('clears the session when a protected request answers 401', () => {
    expect(shouldClearSessionOnUnauthorized(401, '/api/v1/products/import', exempt)).toBe(true);
  });

  it('does not clear the session when the sign-in request itself fails', () => {
    expect(shouldClearSessionOnUnauthorized(401, '/api/v1/auth/sign-in', exempt)).toBe(false);
  });

  it('does not clear the session when the sign-up request fails', () => {
    expect(shouldClearSessionOnUnauthorized(401, '/api/v1/auth/sign-up', exempt)).toBe(false);
  });

  it('ignores statuses other than 401', () => {
    expect(shouldClearSessionOnUnauthorized(500, '/api/v1/products', exempt)).toBe(false);
    expect(shouldClearSessionOnUnauthorized(undefined, '/api/v1/products', exempt)).toBe(false);
  });

  it('clears the session when the request url is unknown', () => {
    expect(shouldClearSessionOnUnauthorized(401, undefined, exempt)).toBe(true);
  });
});

describe('buildSignInHref', () => {
  it('preserves the requested path as returnTo', () => {
    expect(buildSignInHref('/auth/jwt/sign-in', '/dashboard/product/import')).toBe(
      '/auth/jwt/sign-in?returnTo=%2Fdashboard%2Fproduct%2Fimport'
    );
  });

  it('preserves the query string of the requested path', () => {
    expect(buildSignInHref('/auth/jwt/sign-in', '/dashboard/product?page=2')).toBe(
      '/auth/jwt/sign-in?returnTo=%2Fdashboard%2Fproduct%3Fpage%3D2'
    );
  });
});

describe('safeReturnTo', () => {
  it('accepts a same-site path', () => {
    expect(safeReturnTo('/dashboard/status', '/dashboard')).toBe('/dashboard/status');
  });

  it('falls back when there is no returnTo', () => {
    expect(safeReturnTo(null, '/dashboard')).toBe('/dashboard');
  });

  it('rejects absolute and protocol-relative urls', () => {
    expect(safeReturnTo('https://evil.example.com', '/dashboard')).toBe('/dashboard');
    expect(safeReturnTo('//evil.example.com', '/dashboard')).toBe('/dashboard');
  });
});
