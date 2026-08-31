// src/config/app.configuration.ts
import { registerAs } from '@nestjs/config'

export default registerAs('app', () => ({
  name: process.env.APP_NAME || 'ecommerce-api',
  version: process.env.APP_VERSION || '0.1.0',
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  /**
   * How many reverse proxies sit in front of the API. Rate limiting counts by
   * client IP, and behind a proxy every request carries the proxy's address
   * unless Express is told how far down the X-Forwarded-For chain to trust.
   * Zero means a direct connection: the header is ignored, so nobody can forge
   * an address to get a fresh counter.
   */
  trustProxyHops: process.env.TRUST_PROXY_HOPS
    ? parseInt(process.env.TRUST_PROXY_HOPS, 10)
    : 0,
  /**
   * Comma-separated list of origins allowed to call the API. Defaults to the
   * web container's origin: an "enterprise-grade" API does not answer '*'.
   */
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
}))
