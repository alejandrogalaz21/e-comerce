import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ConflictException, NotFoundException } from '@nestjs/common'

import { ProductsService } from './products.service'
import { Product } from './entities/product.entity'
import { PaginationResponseBuilder } from '@/common/pagination/pagination-response.builder'
import { CreateProductDto } from './dto/create-product.dto'

describe('ProductsService', () => {
  let service: ProductsService

  const mockQueryBuilder = {
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getRawMany: jest.fn()
  }

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOneBy: jest.fn(),
    merge: jest.fn(),
    remove: jest.fn()
  }

  const createDto: CreateProductDto = {
    sku: 'RS-001',
    name: 'Running Shoes',
    description: 'Lightweight running shoes for daily training',
    category: 'Footwear',
    price: 89.99,
    stock: 150,
    weightKg: 0.35
  }

  const productEntity: Product = {
    id: '0d6cd087-3f2e-4f30-b0aa-cf9c93b1c0d5',
    sku: 'RS-001',
    name: 'Running Shoes',
    description: 'Lightweight running shoes for daily training',
    category: 'Footwear',
    price: '89.99',
    stock: 150,
    weightKg: '0.35',
    createdAt: new Date('2026-08-26T10:00:00.000Z'),
    updatedAt: new Date('2026-08-26T10:00:00.000Z')
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        PaginationResponseBuilder,
        { provide: getRepositoryToken(Product), useValue: mockRepository }
      ]
    }).compile()

    service = module.get<ProductsService>(ProductsService)
  })

  describe('create', () => {
    it('creates and saves a product', async () => {
      mockRepository.create.mockReturnValue(productEntity)
      mockRepository.save.mockResolvedValue(productEntity)

      const result = await service.create(createDto)

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: 'RS-001',
          name: 'Running Shoes',
          category: 'Footwear',
          price: '89.99',
          stock: 150,
          weightKg: '0.35'
        })
      )
      expect(mockRepository.save).toHaveBeenCalledWith(productEntity)
      expect(result).toEqual(productEntity)
    })

    it("applies 'Uncategorized' default when category is empty", async () => {
      mockRepository.create.mockReturnValue(productEntity)
      mockRepository.save.mockResolvedValue(productEntity)

      await service.create({ ...createDto, category: '   ' })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Uncategorized' })
      )
    })

    it('throws ConflictException on duplicate sku', async () => {
      mockRepository.create.mockReturnValue(productEntity)
      mockRepository.save.mockRejectedValue({ code: '23505' })

      await expect(service.create(createDto)).rejects.toThrow(ConflictException)
      await expect(service.create(createDto)).rejects.toThrow(
        "Product with sku 'RS-001' already exists"
      )
    })
  })

  describe('findAll', () => {
    const searchWhere =
      '(product.name ILIKE :term OR product.sku ILIKE :term OR product.description ILIKE :term OR product.category ILIKE :term)'

    beforeEach(() => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[productEntity], 1])
    })

    it('returns the pagination builder envelope ordered by createdAt DESC', async () => {
      const result = await service.findAll({ page: '1', limit: '10' })

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('product')
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'product.createdAt',
        'DESC'
      )
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0)
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10)
      expect(result).toEqual({
        data: [productEntity],
        pagination: {
          total: 1,
          per_page: 10,
          current_page: 1,
          last_page: 1,
          from: 1,
          to: 1
        }
      })
    })

    it('applies no filters when q and category are absent', async () => {
      await service.findAll({ page: '1', limit: '10' })

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled()
    })

    it('matches q across name, sku, description and category as a bound parameter', async () => {
      await service.findAll({ q: 'camping' })

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(searchWhere, {
        term: '%camping%'
      })
    })

    it('passes a SQL injection payload as a bound parameter instead of inlining it', async () => {
      const payload = "Robert'); DROP TABLE products;--"

      const result = await service.findAll({ q: payload })

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(searchWhere, {
        term: `%${payload}%`
      })

      const [sql] = mockQueryBuilder.andWhere.mock.calls[0]
      expect(sql).not.toContain('DROP TABLE')
      expect(sql).toContain(':term')
      expect(result.data).toEqual([productEntity])
    })

    it('escapes LIKE wildcards so they are matched literally', async () => {
      await service.findAll({ q: '100%_off\\' })

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(searchWhere, {
        term: '%100\\%\\_off\\\\%'
      })
    })

    it('filters by category case-insensitively', async () => {
      await service.findAll({ category: ['Footwear'] })

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(product.category) IN (:...categories)',
        { categories: ['footwear'] }
      )
    })

    it('filters by several categories at once', async () => {
      await service.findAll({ category: ['Electronics', 'Tools'] })

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(product.category) IN (:...categories)',
        { categories: ['electronics', 'tools'] }
      )
    })

    it('ignores an empty category list', async () => {
      await service.findAll({ category: [] })

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled()
    })

    it('filters by minimum price', async () => {
      await service.findAll({ minPrice: 20 })

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.price >= :minPrice',
        { minPrice: 20 }
      )
    })

    it('filters by maximum price', async () => {
      await service.findAll({ maxPrice: 50 })

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.price <= :maxPrice',
        { maxPrice: 50 }
      )
    })

    it('applies both price bounds when a range is given', async () => {
      await service.findAll({ minPrice: 10, maxPrice: 30 })

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2)
    })

    it('keeps a zero minimum price as an active filter', async () => {
      await service.findAll({ minPrice: 0 })

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.price >= :minPrice',
        { minPrice: 0 }
      )
    })

    it('filters products with stock when inStock is true', async () => {
      await service.findAll({ inStock: true })

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.stock > 0'
      )
    })

    it('filters sold out products when inStock is false', async () => {
      await service.findAll({ inStock: false })

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.stock = 0'
      )
    })

    it('does not filter by availability when inStock is absent', async () => {
      await service.findAll({ q: 'shoes' })

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(1)
    })

    it('combines every filter conjunctively', async () => {
      await service.findAll({
        q: 'stand',
        category: ['Electronics'],
        minPrice: 10,
        maxPrice: 30,
        inStock: true
      })

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(5)
    })

    it('sorts by a whitelisted field in the requested direction', async () => {
      await service.findAll({ sortBy: 'price', sortDir: 'asc' })

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'product.price',
        'ASC'
      )
    })

    it('sorts by updatedAt so upserted rows surface first', async () => {
      await service.findAll({ sortBy: 'updatedAt', sortDir: 'desc' })

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'product.updatedAt',
        'DESC'
      )
    })

    it('falls back to the default order when sortBy is not whitelisted', async () => {
      await service.findAll({
        sortBy: 'password' as never,
        sortDir: 'asc'
      })

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'product.createdAt',
        'ASC'
      )

      const [column] = mockQueryBuilder.orderBy.mock.calls[0]
      expect(column).not.toContain('password')
    })

    it('adds a deterministic tie breaker so pages do not overlap', async () => {
      await service.findAll({ sortBy: 'stock', sortDir: 'desc' })

      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'product.id',
        'ASC'
      )
    })
  })

  describe('findCategories', () => {
    it('returns categories with a numeric count', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { category: 'Accessories', count: '2' },
        { category: 'Electronics', count: '7' }
      ])

      const result = await service.findCategories()

      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('product.category')
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'product.category',
        'ASC'
      )
      expect(result).toEqual([
        { category: 'Accessories', count: 2 },
        { category: 'Electronics', count: 7 }
      ])
    })

    it('returns an empty list for an empty catalog', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([])

      await expect(service.findCategories()).resolves.toEqual([])
    })
  })

  describe('findOne', () => {
    it('returns a product by id', async () => {
      mockRepository.findOneBy.mockResolvedValue(productEntity)

      const result = await service.findOne(productEntity.id)

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        id: productEntity.id
      })
      expect(result).toEqual(productEntity)
    })

    it('throws NotFoundException when the product does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null)

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('update', () => {
    it('merges changes and saves', async () => {
      const updated = { ...productEntity, name: 'Trail Shoes' }
      mockRepository.findOneBy.mockResolvedValue(productEntity)
      mockRepository.merge.mockImplementation(
        (entity: Product, data: Partial<Product>) => Object.assign(entity, data)
      )
      mockRepository.save.mockResolvedValue(updated)

      const result = await service.update(productEntity.id, {
        name: 'Trail Shoes'
      })

      expect(mockRepository.merge).toHaveBeenCalledWith(productEntity, {
        name: 'Trail Shoes'
      })
      expect(mockRepository.save).toHaveBeenCalled()
      expect(result).toEqual(updated)
    })

    it('throws ConflictException on duplicate sku', async () => {
      mockRepository.findOneBy.mockResolvedValue({ ...productEntity })
      mockRepository.merge.mockImplementation(
        (entity: Product, data: Partial<Product>) => Object.assign(entity, data)
      )
      mockRepository.save.mockRejectedValue({ code: '23505' })

      await expect(
        service.update(productEntity.id, { sku: 'RS-002' })
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('remove', () => {
    it('removes an existing product', async () => {
      mockRepository.findOneBy.mockResolvedValue(productEntity)
      mockRepository.remove.mockResolvedValue(productEntity)

      await service.remove(productEntity.id)

      expect(mockRepository.remove).toHaveBeenCalledWith(productEntity)
    })

    it('throws NotFoundException when the product does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null)

      await expect(service.remove('missing-id')).rejects.toThrow(
        NotFoundException
      )
    })
  })
})
