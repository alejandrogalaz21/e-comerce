import { registerAs } from '@nestjs/config'

const fromEnv = (name: string, fallback: number): number => {
  const parsed = parseInt(process.env[name] ?? '', 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const THROTTLE = {
  default: { ttl: 60_000, limit: fromEnv('THROTTLE_LIMIT', 300) },
  import: { ttl: 60_000, limit: fromEnv('IMPORT_RATE_LIMIT', 20) },
  placeOrder: { ttl: 60_000, limit: fromEnv('ORDER_RATE_LIMIT', 20) }
} as const

export default registerAs('throttle', () => THROTTLE)
