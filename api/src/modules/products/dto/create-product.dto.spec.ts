import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { CreateProductDto } from './create-product.dto'
import { UpdateProductDto } from './update-product.dto'

describe('CreateProductDto validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true
    }
  })

  const transform = (payload: Record<string, unknown>) =>
    pipe.transform(payload, { type: 'body', metatype: CreateProductDto })

  const expectRejection = async (
    payload: Record<string, unknown>
  ): Promise<string[]> => {
    try {
      await transform(payload)
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException)
      const response = (error as BadRequestException).getResponse() as {
        message: string[]
      }
      return response.message
    }
    throw new Error('expected validation to fail but it passed')
  }

  const validPayload = (): Record<string, unknown> => ({
    sku: 'RS-001',
    name: 'Running Shoes',
    price: 89.99,
    stock: 150,
    weightKg: 0.35
  })

  it('accepts a valid complete product and returns a transformed instance (CSV line 2)', async () => {
    const result = await transform(validPayload())

    expect(result).toBeInstanceOf(CreateProductDto)
    expect(result).toMatchObject({
      sku: 'RS-001',
      name: 'Running Shoes',
      price: 89.99,
      stock: 150,
      weightKg: 0.35
    })
  })

  it('rejects an empty name (CSV line 25)', async () => {
    const messages = await expectRejection({ ...validPayload(), name: '' })

    expect(messages).toContain('name should not be empty')
  })

  it('rejects a whitespace-only name after trimming (CSV line 41)', async () => {
    const messages = await expectRejection({ ...validPayload(), name: '   ' })

    expect(messages).toContain('name should not be empty')
  })

  it('accepts an XSS name but strips the HTML tags (CSV line 20)', async () => {
    const result = await transform({
      ...validPayload(),
      name: "<script>alert('xss')</script>"
    })

    expect(result.name).toBe("alert('xss')")
    expect(result.name).not.toContain('<')
    expect(result.name).not.toContain('>')
  })

  it('rejects a SQL injection sku via the allowed pattern (CSV line 29)', async () => {
    const messages = await expectRejection({
      ...validPayload(),
      sku: "Robert'); DROP TABLE products;--"
    })

    expect(messages).toContain(
      'sku must contain only letters, digits and hyphens'
    )
  })

  it('accepts price 0 for a free product (CSV line 47)', async () => {
    const result = await transform({ ...validPayload(), price: 0 })

    expect(result.price).toBe(0)
  })

  it('rejects a negative price', async () => {
    const messages = await expectRejection({ ...validPayload(), price: -5 })

    expect(messages.some(m => m.includes('price'))).toBe(true)
  })

  it('rejects a price with more than 2 decimal places', async () => {
    const messages = await expectRejection({ ...validPayload(), price: 19.999 })

    expect(messages.some(m => m.includes('price'))).toBe(true)
  })

  it('rejects negative stock (CSV line 16)', async () => {
    const messages = await expectRejection({ ...validPayload(), stock: -5 })

    expect(messages.some(m => m.includes('stock'))).toBe(true)
  })

  it('accepts stock 0 as a valid out-of-stock state (CSV line 51)', async () => {
    const result = await transform({ ...validPayload(), stock: 0 })

    expect(result.stock).toBe(0)
  })

  it('accepts an omitted weightKg and keeps it undefined (CSV line 50)', async () => {
    const payload = validPayload()
    delete payload.weightKg

    const result = await transform(payload)

    expect(result.weightKg).toBeUndefined()
  })

  it('rejects a negative weightKg', async () => {
    const messages = await expectRejection({ ...validPayload(), weightKg: -1 })

    expect(messages.some(m => m.includes('weightKg'))).toBe(true)
  })

  it('accepts an omitted category (CSV line 52)', async () => {
    const result = await transform(validPayload())

    expect(result.category).toBeUndefined()
  })

  it('preserves a unicode name intact (CSV line 31)', async () => {
    const name = 'Water Bottle — keeps drinks cold™'

    const result = await transform({ ...validPayload(), name })

    expect(result.name).toBe(name)
  })

  it('accepts a name with commas and quotes (CSV lines 53/59)', async () => {
    const name = 'Comma, In "Product" Name'

    const result = await transform({ ...validPayload(), name })

    expect(result.name).toBe(name)
  })

  it('rejects an unknown extra field via forbidNonWhitelisted', async () => {
    const messages = await expectRejection({
      ...validPayload(),
      hacked: true
    })

    expect(messages).toContain('property hacked should not exist')
  })

  it('sanitizes HTML tags out of the description', async () => {
    const result = await transform({
      ...validPayload(),
      description: '<b>bold</b> text'
    })

    expect(result.description).toBe('bold text')
  })
})

describe('UpdateProductDto validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true
    }
  })

  it('accepts a partial payload with only price', async () => {
    const result = await pipe.transform(
      { price: 10 },
      { type: 'body', metatype: UpdateProductDto }
    )

    expect(result).toBeInstanceOf(UpdateProductDto)
    expect(result.price).toBe(10)
    expect(result.name).toBeUndefined()
  })
})
