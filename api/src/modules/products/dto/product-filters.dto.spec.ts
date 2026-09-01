import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { ProductFiltersDto } from './product-filters.dto'

describe('ProductFiltersDto validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true
    }
  })

  const transform = (query: Record<string, unknown>) =>
    pipe.transform(query, {
      type: 'query',
      metatype: ProductFiltersDto
    }) as Promise<ProductFiltersDto>

  const expectRejection = async (
    query: Record<string, unknown>
  ): Promise<string[]> => {
    try {
      await transform(query)
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException)
      const response = (error as BadRequestException).getResponse() as {
        message: string[]
      }
      return response.message
    }
    throw new Error('expected validation to fail but it passed')
  }

  describe('price range', () => {
    it('accepts a valid range', async () => {
      const dto = await transform({ minPrice: '10', maxPrice: '30.5' })

      expect(dto.minPrice).toBe(10)
      expect(dto.maxPrice).toBe(30.5)
    })

    it('rejects a negative minimum', async () => {
      const messages = await expectRejection({ minPrice: '-5' })

      expect(messages.join(' ')).toContain('minPrice')
    })

    it('rejects a maximum lower than the minimum', async () => {
      const messages = await expectRejection({
        minPrice: '50',
        maxPrice: '10'
      })

      expect(messages).toContain('maxPrice must not be less than minPrice')
    })

    it('accepts a maximum equal to the minimum', async () => {
      const dto = await transform({ minPrice: '20', maxPrice: '20' })

      expect(dto.maxPrice).toBe(20)
    })

    it('rejects a non numeric bound', async () => {
      const messages = await expectRejection({ minPrice: 'free' })

      expect(messages.join(' ')).toContain('minPrice')
    })
  })

  describe('category', () => {
    it('splits a comma separated list', async () => {
      const dto = await transform({ category: 'Electronics,Tools' })

      expect(dto.category).toEqual(['Electronics', 'Tools'])
    })

    it('trims blanks, drops empty fragments and deduplicates', async () => {
      const dto = await transform({
        category: 'Electronics, ,Tools, Electronics,'
      })

      expect(dto.category).toEqual(['Electronics', 'Tools'])
    })

    it('wraps a single category into a list', async () => {
      const dto = await transform({ category: 'Footwear' })

      expect(dto.category).toEqual(['Footwear'])
    })

    it('rejects a list longer than the allowed size', async () => {
      const category = Array.from({ length: 21 }, (_, i) => `c${i}`).join(',')

      const messages = await expectRejection({ category })

      expect(messages.join(' ')).toContain('category')
    })
  })

  describe('inStock', () => {
    it.each([
      ['true', true],
      ['false', false]
    ])('parses %s into a boolean', async (raw, expected) => {
      const dto = await transform({ inStock: raw })

      expect(dto.inStock).toBe(expected)
    })

    it('is absent when not provided', async () => {
      const dto = await transform({})

      expect(dto.inStock).toBeUndefined()
    })

    it('rejects a value that is neither true nor false', async () => {
      const messages = await expectRejection({ inStock: 'yes' })

      expect(messages.join(' ')).toContain('inStock')
    })
  })

  describe('sorting', () => {
    it.each(['name', 'price', 'stock', 'createdAt', 'updatedAt'])(
      'accepts %s as a sort field',
      async sortBy => {
        const dto = await transform({ sortBy })

        expect(dto.sortBy).toBe(sortBy)
      }
    )

    it('rejects a sort field outside the whitelist', async () => {
      const messages = await expectRejection({ sortBy: 'password' })

      expect(messages.join(' ')).toContain('sortBy')
    })

    it('rejects a sort field carrying a SQL fragment', async () => {
      const messages = await expectRejection({
        sortBy: 'name; DROP TABLE products;--'
      })

      expect(messages.join(' ')).toContain('sortBy')
    })

    it('rejects an unknown direction', async () => {
      const messages = await expectRejection({ sortDir: 'sideways' })

      expect(messages.join(' ')).toContain('sortDir')
    })

    it('leaves sorting undefined when not requested', async () => {
      const dto = await transform({ page: '1', limit: '10' })

      expect(dto.sortBy).toBeUndefined()
      expect(dto.sortDir).toBeUndefined()
    })
  })

  describe('catalog status', () => {
    it('accepts the three states the catalog can be asked for', async () => {
      for (const status of ['active', 'discontinued', 'all'] as const) {
        // eslint-disable-next-line no-await-in-loop
        const dto = await transform({ status })

        expect(dto.status).toBe(status)
      }
    })

    it('rejects an unknown state and names the valid ones', async () => {
      const messages = await expectRejection({ status: 'retired' })

      expect(messages.join(' ')).toContain('status')
      expect(messages.join(' ')).toContain('active')
      expect(messages.join(' ')).toContain('discontinued')
    })

    it('leaves the status undefined when not requested, so the service decides the default', async () => {
      const dto = await transform({ page: '1', limit: '10' })

      expect(dto.status).toBeUndefined()
    })
  })

  it('rejects unknown query parameters', async () => {
    await expectRejection({ orderBy: 'price' })
  })
})
