import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'

import { Product } from '@/modules/products/entities/product.entity'
import { ImportService } from '@/modules/import/import.service'
import { SeedService } from './seed.service'

describe('SeedService', () => {
  let service: SeedService
  let productRepository: { count: jest.Mock }
  let importService: { importCsv: jest.Mock }
  let originalSeedOnBoot: string | undefined

  beforeEach(async () => {
    originalSeedOnBoot = process.env.SEED_ON_BOOT
    delete process.env.SEED_ON_BOOT

    productRepository = { count: jest.fn().mockResolvedValue(0) }
    importService = {
      importCsv: jest.fn().mockResolvedValue({
        batchId: 'batch-1',
        summary: {
          totalRows: 97,
          inserted: 87,
          updated: 3,
          unchanged: 0,
          rejected: 5,
          skippedEmpty: 2
        },
        rejected: [],
        warnings: []
      })
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        { provide: getRepositoryToken(Product), useValue: productRepository },
        { provide: ImportService, useValue: importService }
      ]
    }).compile()

    service = module.get(SeedService)
  })

  afterEach(() => {
    if (originalSeedOnBoot === undefined) delete process.env.SEED_ON_BOOT
    else process.env.SEED_ON_BOOT = originalSeedOnBoot
  })

  it('skips when SEED_ON_BOOT is false', async () => {
    process.env.SEED_ON_BOOT = 'false'

    await service.onApplicationBootstrap()

    expect(productRepository.count).not.toHaveBeenCalled()
    expect(importService.importCsv).not.toHaveBeenCalled()
  })

  it('skips when products already exist', async () => {
    productRepository.count.mockResolvedValue(42)

    await service.onApplicationBootstrap()

    expect(importService.importCsv).not.toHaveBeenCalled()
  })

  it('imports the bundled CSV when the products table is empty', async () => {
    await service.onApplicationBootstrap()

    expect(importService.importCsv).toHaveBeenCalledTimes(1)
    const file = importService.importCsv.mock.calls[0][0]
    expect(file.originalname).toBe('loanpro-sample.csv')
    expect(file.mimetype).toBe('text/csv')
    expect(Buffer.isBuffer(file.buffer)).toBe(true)
    expect(file.size).toBe(file.buffer.length)
    expect(file.buffer.toString('utf8')).toContain(
      'name,sku,description,category,price,stock,weight_kg'
    )
  })

  it('does not throw when the import fails', async () => {
    importService.importCsv.mockRejectedValue(new Error('boom'))

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined()
  })

  it('does not throw when counting products fails', async () => {
    productRepository.count.mockRejectedValue(new Error('db down'))

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined()
    expect(importService.importCsv).not.toHaveBeenCalled()
  })
})
