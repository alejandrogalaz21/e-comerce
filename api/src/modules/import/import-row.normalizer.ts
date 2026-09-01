import { Injectable } from '@nestjs/common'

export interface NormalizedRow {
  values: Record<string, unknown>
  errors: string[]
  isEmpty: boolean
  sku: string
  name: string
}

const CURRENCY_PRICE_REGEX = /^[^0-9.-]*[0-9]/
const NON_NUMERIC_CHARS_REGEX = /[^0-9.-]/g

@Injectable()
export class ImportRowNormalizer {
  normalize(row: Record<string, unknown>): NormalizedRow {
    const raw: Record<string, string> = {}
    for (const key of Object.keys(row)) {
      raw[key] = row[key] == null ? '' : String(row[key]).trim()
    }

    const isEmpty = Object.values(raw).every(value => value === '')
    const sku = raw.sku ?? ''
    const name = raw.name ?? ''
    if (isEmpty) return { values: {}, errors: [], isEmpty: true, sku, name }

    const errors: string[] = []
    const values: Record<string, unknown> = {
      name: raw.name ?? '',
      sku: raw.sku ?? ''
    }

    if (raw.description) values.description = raw.description
    if (raw.category) values.category = raw.category

    values.price = this.parseNumericField(raw.price, 'price', errors, {
      cleanCurrency: true
    })
    values.stock = this.parseNumericField(raw.stock, 'stock', errors)

    if (raw.weight_kg) {
      const weight = this.parseNumericField(raw.weight_kg, 'weight_kg', errors)
      if (weight !== undefined) values.weightKg = weight
    }

    return { values, errors, isEmpty: false, sku, name }
  }

  private parseNumericField(
    rawValue: string | undefined,
    field: string,
    errors: string[],
    options: { cleanCurrency?: boolean } = {}
  ): number | undefined {
    const raw = rawValue ?? ''
    let candidate = raw

    if (options.cleanCurrency && CURRENCY_PRICE_REGEX.test(raw)) {
      candidate = raw.replace(NON_NUMERIC_CHARS_REGEX, '')
    }

    const parsed = Number(candidate)
    if (candidate === '' || !Number.isFinite(parsed)) {
      errors.push(`${field} is not a valid number: '${raw}'`)
      return undefined
    }

    return parsed
  }
}
