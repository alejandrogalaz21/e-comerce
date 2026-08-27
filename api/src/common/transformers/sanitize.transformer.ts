export function trimText(value: unknown): unknown {
  if (typeof value !== 'string') return value
  return value.trim()
}
