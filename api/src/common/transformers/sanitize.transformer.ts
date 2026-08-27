const HTML_TAG_REGEX = /<[^>]*>/g

export function sanitizeText(value: unknown): unknown {
  if (typeof value !== 'string') return value
  return value.replace(HTML_TAG_REGEX, '').trim()
}

export function trimText(value: unknown): unknown {
  if (typeof value !== 'string') return value
  return value.trim()
}
