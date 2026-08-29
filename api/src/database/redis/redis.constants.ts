/**
 * The injection token lives apart from the module so that providers in this
 * folder can import it without importing the module that declares them, which
 * is a cycle Nest resolves as undefined.
 */
export const REDIS_CLIENT = 'REDIS_CLIENT'
