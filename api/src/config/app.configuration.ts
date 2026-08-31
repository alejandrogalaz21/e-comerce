// src/config/app.configuration.ts
import { randomBytes } from 'crypto'
import { registerAs } from '@nestjs/config'

const WEAK_JWT_SECRETS = ['changeme', 'secret', 'password', 'jwt', 'test']
const MIN_JWT_SECRET_LENGTH = 16

/**
 * A signing key is the whole authentication system. An unset one used to reach
 * passport as `undefined`, and a placeholder committed to a compose file is
 * public knowledge — anyone can mint an administrator token with it. So a weak
 * value stops the boot, and an absent one is generated: sessions then die with
 * the process, which is loud and harmless, unlike a secret everybody knows.
 */
export function resolveJwtSecret(
  raw: string | undefined,
  logger: Pick<Console, 'warn'> = console
): string {
  const secret = raw?.trim()

  if (!secret) {
    logger.warn(
      'JWT_SECRET is not set: generating a random one for this process. Sessions will not survive a restart. Set JWT_SECRET to keep them.'
    )

    return randomBytes(48).toString('hex')
  }

  if (
    WEAK_JWT_SECRETS.includes(secret.toLowerCase()) ||
    secret.length < MIN_JWT_SECRET_LENGTH
  ) {
    throw new Error(
      `JWT_SECRET is a placeholder or shorter than ${MIN_JWT_SECRET_LENGTH} characters. Anyone knowing it can issue valid tokens; set a strong value or leave it unset to get a generated one.`
    )
  }

  return secret
}

export default registerAs('app', () => ({
  name: process.env.APP_NAME || 'ecommerce-api',
  version: process.env.APP_VERSION || '0.1.0',
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
  jwtSecret: resolveJwtSecret(process.env.JWT_SECRET),
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
