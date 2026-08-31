import { registerAs } from '@nestjs/config'

const fromEnv = (name: string, fallback: number): number => {
  const parsed = parseInt(process.env[name] ?? '', 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Exported as a plain object as well as a config namespace: `@Throttle` is
 * evaluated when a controller class is defined, before the DI container exists,
 * so a route ceiling cannot come from ConfigService. The namespace below derives
 * from this same object, which is what keeps the module and the decorators from
 * drifting apart.
 *
 * A rule with no explicit `name` is registered as `default`, which is the rule
 * every `@Throttle` here overrides. Giving the global rule a name of its own —
 * what adding a second `burst` rule invites — leaves those overrides pointing at
 * a rule that no longer exists, and the route ceilings vanish without an error.
 * rate-limit.spec.ts is what catches that.
 */
export const THROTTLE = {
  /**
   * Deliberately loose: the status page alone polls three endpoints every five
   * seconds. Routes that need a real ceiling declare it with `@Throttle`.
   */
  default: { ttl: 60_000, limit: fromEnv('THROTTLE_LIMIT', 300) },
  /**
   * Imports allowed per minute. Generous for a person, useless for a script.
   * Configurable because an end-to-end suite legitimately imports far faster
   * than a human ever would.
   */
  import: { ttl: 60_000, limit: fromEnv('IMPORT_RATE_LIMIT', 20) },
  /**
   * Guest checkout is the only public route that writes and charges. A shopper
   * places one order; a script placing twenty a minute is not shopping.
   */
  placeOrder: { ttl: 60_000, limit: fromEnv('ORDER_RATE_LIMIT', 20) }
} as const

export default registerAs('throttle', () => THROTTLE)
