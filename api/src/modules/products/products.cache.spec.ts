import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'

import { PaginationResponseBuilder } from '@/common/pagination/pagination-response.builder'
import { CacheService } from '@/database/redis/cache.service'

import { Product } from './entities/product.entity'
import { ProductsService } from './products.service'

/**
 * The catalog is read far more often than it is written, which is the case the
 * cache exists for. What matters is that a write is never served stale and that
 * a cache failure never reaches the caller.
 */
describe('ProductsService caching', () => {
  let service: ProductsService
  let store: Map<string, unknown>

  const queryBuilder = {
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getRawMany: jest.fn().mockResolvedValue([])
  }

  const mockRepository = {
    createQueryBuilder: jest.fn(() => queryBuilder),
    create: jest.fn(data => ({ ...data })),
    save: jest.fn(async entity => ({ id: 'generated', ...entity })),
    findOneBy: jest.fn().mockResolvedValue({ id: 'x', sku: 'RS-001' }),
    merge: jest.fn((product, data) => Object.assign(product, data)),
    remove: jest.fn().mockResolvedValue(undefined)
  }

  const cache = {
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    set: jest.fn(async (key: string, value: unknown) => {
      store.set(key, value)
    }),
    invalidatePrefix: jest.fn(async () => {
      store.clear()
    })
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    store = new Map()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        PaginationResponseBuilder,
        { provide: getRepositoryToken(Product), useValue: mockRepository },
        { provide: CacheService, useValue: cache }
      ]
    }).compile()

    service = module.get<ProductsService>(ProductsService)
  })

  describe('reading', () => {
    it('queries the database once for two identical requests', async () => {
      await service.findAll({ page: 1, limit: 20 })
      await service.findAll({ page: 1, limit: 20 })

      expect(queryBuilder.getManyAndCount).toHaveBeenCalledTimes(1)
    })

    it('serves the second request exactly what the first produced', async () => {
      const first = await service.findAll({ page: 1 })
      const second = await service.findAll({ page: 1 })

      expect(second).toEqual(first)
    })

    it('does not share an entry between different queries', async () => {
      await service.findAll({ page: 1 })
      await service.findAll({ page: 2 })

      expect(queryBuilder.getManyAndCount).toHaveBeenCalledTimes(2)
    })

    it('caches the category list too, since the storefront asks for it on every load', async () => {
      await service.findCategories()
      await service.findCategories()

      expect(queryBuilder.getRawMany).toHaveBeenCalledTimes(1)
    })
  })

  describe('invalidation', () => {
    it('drops the cache when a product is created', async () => {
      await service.findAll({ page: 1 })
      await service.create({
        sku: 'NEW-1',
        name: 'New',
        price: 1,
        stock: 1
      } as never)
      await service.findAll({ page: 1 })

      expect(cache.invalidatePrefix).toHaveBeenCalled()
      expect(queryBuilder.getManyAndCount).toHaveBeenCalledTimes(2)
    })

    it('drops the cache when a product is updated', async () => {
      await service.findAll({ page: 1 })
      await service.update('x', { stock: 5 } as never)
      await service.findAll({ page: 1 })

      expect(queryBuilder.getManyAndCount).toHaveBeenCalledTimes(2)
    })

    it('drops the cache when a product is removed', async () => {
      await service.findAll({ page: 1 })
      await service.remove('x')
      await service.findAll({ page: 1 })

      expect(queryBuilder.getManyAndCount).toHaveBeenCalledTimes(2)
    })

    it('drops the categories along with the listings', async () => {
      await service.findCategories()
      await service.create({
        sku: 'NEW-2',
        name: 'New',
        price: 1,
        stock: 1
      } as never)
      await service.findCategories()

      expect(queryBuilder.getRawMany).toHaveBeenCalledTimes(2)
    })
  })

  describe('when Redis is down', () => {
    /** A real CacheService over a failing client: the swallow must hold end to end. */
    const failing = () =>
      new CacheService({
        get: jest.fn().mockRejectedValue(new Error('connection refused')),
        set: jest.fn().mockRejectedValue(new Error('connection refused')),
        keys: jest.fn().mockRejectedValue(new Error('connection refused')),
        del: jest.fn()
      } as never)

    it('still serves the catalog, computed against the database', async () => {
      const degraded = new ProductsService(
        mockRepository as never,
        new PaginationResponseBuilder<Product>(),
        failing()
      )

      await expect(degraded.findAll({ page: 1 })).resolves.toBeDefined()
      expect(queryBuilder.getManyAndCount).toHaveBeenCalled()
    })

    it('still writes, even though invalidation cannot reach Redis', async () => {
      const degraded = new ProductsService(
        mockRepository as never,
        new PaginationResponseBuilder<Product>(),
        failing()
      )

      await expect(
        degraded.create({ sku: 'X-1', name: 'X', price: 1, stock: 1 } as never)
      ).resolves.toBeDefined()
    })

    it('works with no cache wired at all', async () => {
      const uncached = new ProductsService(
        mockRepository as never,
        new PaginationResponseBuilder<Product>()
      )

      await expect(uncached.findAll({ page: 1 })).resolves.toBeDefined()
    })
  })
})
