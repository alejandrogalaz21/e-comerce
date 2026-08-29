export function trimText(value: unknown): unknown {
  if (typeof value !== 'string') return value
  return value.trim()
}

export function escapeLikeWildcards(value: string): string {
  return value.replace(/[\\%_]/g, char => `\\${char}`)
}
