import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ConflictException, NotFoundException } from '@nestjs/common'

import { ProductsService } from './products.service'
import { Product } from './entities/product.entity'
import { PaginationResponseBuilder } from '@/common/pagination/pagination-response.builder'
import { CreateProductDto } from './dto/create-product.dto'

describe('ProductsService', () => {
  let service: ProductsService

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
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
    it('returns the pagination builder envelope ordered by createdAt DESC', async () => {
      mockRepository.findAndCount.mockResolvedValue([[productEntity], 1])

      const result = await service.findAll({ page: '1', limit: '10' })

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        order: { createdAt: 'DESC' }
      })
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
