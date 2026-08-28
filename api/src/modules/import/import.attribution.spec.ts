import { ExecutionContext } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants'

import { ImportController } from './import.controller'
import { ImportService } from './import.service'
import { ImportRowNormalizer } from './import-row.normalizer'
import { ImportBatch } from './import-batch.entity'
import { Product } from '@/modules/products/entities/product.entity'
import { ProductsService } from '@/modules/products/products.service'
import { PaginationResponseBuilder } from '@/common/pagination/pagination-response.builder'
import { currentUserFactory } from '@/common/decorators/current-user.decorator'

const CSV_HEADER = 'name,sku,description,category,price,stock,weight_kg'

function csvFile(rows: string[]): Express.Multer.File {
  const content = [CSV_HEADER, ...rows].join('\n')
  return {
    originalname: 'products.csv',
    mimetype: 'text/csv',
    buffer: Buffer.from(content, 'utf8'),
    size: content.length
  } as Express.Multer.File
}

function contextWithUser(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) })
  } as unknown as ExecutionContext
}

describe('import attribution', () => {
  let service: ImportService
  let controller: ImportController

  const mockProductRepository = {
    create: jest.fn(data => ({ ...data })),
    save: jest.fn(async entity => ({ id: 'product-id', ...entity })),
    findOne: jest.fn(async () => null)
  }

  const mockBatchRepository = {
    create: jest.fn(data => ({ ...data })),
    save: jest.fn(async batch => ({ id: 'generated-batch-id', ...batch })),
    findAndCount: jest.fn(),
    findOneBy: jest.fn()
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    mockProductRepository.create.mockImplementation(data => ({ ...data }))
    mockProductRepository.save.mockImplementation(async entity => ({
      id: 'product-id',
      ...entity
    }))
    mockProductRepository.findOne.mockResolvedValue(null)
    mockBatchRepository.create.mockImplementation(data => ({ ...data }))
    mockBatchRepository.save.mockImplementation(async batch => ({
      id: 'generated-batch-id',
      ...batch
    }))

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportController],
      providers: [
        ImportService,
        ImportRowNormalizer,
        ProductsService,
        PaginationResponseBuilder,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository
        },
        {
          provide: getRepositoryToken(ImportBatch),
          useValue: mockBatchRepository
        }
      ]
    }).compile()

    service = module.get(ImportService)
    controller = module.get(ImportController)
  })

  it('attributes the batch to the email carried by the token', async () => {
    const result = await controller.import(
      csvFile(['Running Shoes,RS-001,desc,Footwear,89.99,150,0.35']),
      'demo@demo.com'
    )

    expect(mockBatchRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ importedBy: 'demo@demo.com' })
    )
    expect(result.created).toEqual([
      { line: 2, sku: 'RS-001', name: 'Running Shoes' }
    ])
  })

  it('reads the email from the request user, not from the payload', () => {
    expect(
      currentUserFactory('email', contextWithUser({ email: 'demo@demo.com' }))
    ).toBe('demo@demo.com')
    expect(
      currentUserFactory(undefined, contextWithUser(undefined))
    ).toBeUndefined()
  })

  it('ignores an importedBy sent by the client', () => {
    const args = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      ImportController,
      'import'
    ) as Record<string, unknown>

    const bodyOrQueryParams = Object.keys(args).filter(key =>
      /^(3|4):/.test(key)
    )

    expect(bodyOrQueryParams).toEqual([])
  })

  it('stores null when no user email reaches the service', async () => {
    await service.importCsv(
      csvFile(['Running Shoes,RS-001,desc,Footwear,89.99,150,0.35'])
    )

    expect(mockBatchRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ importedBy: null })
    )
  })

  it('exposes the attribution in the paginated batch list', async () => {
    mockBatchRepository.findAndCount.mockResolvedValue([
      [{ id: 'batch-1', filename: 'a.csv', importedBy: 'demo@demo.com' }],
      1
    ])

    const result = await service.findAllBatches({})

    expect(mockBatchRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.arrayContaining(['importedBy'])
      })
    )
    expect(result.data[0]).toEqual(
      expect.objectContaining({ importedBy: 'demo@demo.com' })
    )
  })

  it('serializes a historical batch with no attribution', async () => {
    mockBatchRepository.findOneBy.mockResolvedValue({
      id: 'legacy-batch',
      filename: 'legacy.csv',
      status: 'completed',
      importedBy: null,
      report: null
    })

    const batch = await service.findBatch('legacy-batch')

    expect(batch.importedBy).toBeNull()
    expect(batch.report).toEqual({ rejected: [], warnings: [], created: [] })
    expect(() => JSON.stringify(batch)).not.toThrow()
  })
})
