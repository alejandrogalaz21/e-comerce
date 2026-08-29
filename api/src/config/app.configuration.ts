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
   * Comma-separated list of origins allowed to call the API. Defaults to the
   * web container's origin: an "enterprise-grade" API does not answer '*'.
   */
  /**
   * Imports allowed per minute. Generous for a person, useless for a script.
   * Configurable because an end-to-end suite legitimately imports far faster
   * than a human ever would.
   */
  importRateLimit: process.env.IMPORT_RATE_LIMIT
    ? parseInt(process.env.IMPORT_RATE_LIMIT, 10)
    : 20,
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
}))
