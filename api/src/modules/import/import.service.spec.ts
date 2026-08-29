import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { BadRequestException } from '@nestjs/common'

import { ImportService } from './import.service'
import { ImportRowNormalizer } from './import-row.normalizer'
import { ImportBatch } from './import-batch.entity'
import { Product } from '@/modules/products/entities/product.entity'
import { ProductsService } from '@/modules/products/products.service'
import { PaginationResponseBuilder } from '@/common/pagination/pagination-response.builder'

const CSV_HEADER = 'name,sku,description,category,price,stock,weight_kg'

function csvFile(
  rows: string[],
  overrides: Partial<Express.Multer.File> = {}
): Express.Multer.File {
  const content = [CSV_HEADER, ...rows].join('\n')
  return {
    originalname: 'products.csv',
    mimetype: 'text/csv',
    buffer: Buffer.from(content, 'utf8'),
    size: content.length,
    ...overrides
  } as Express.Multer.File
}

describe('ImportService', () => {
  let service: ImportService

  const mockProductRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn()
  }

  const mockBatchRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOneBy: jest.fn()
  }

  const existingProduct = (overrides: Partial<Product> = {}): Product =>
    ({
      id: '0d6cd087-3f2e-4f30-b0aa-cf9c93b1c0d5',
      sku: 'RS-001',
      name: 'Running Shoes',
      description: 'Lightweight running shoes for daily training',
      category: 'Footwear',
      price: '89.99',
      stock: 150,
      weightKg: '0.35',
      createdAt: new Date('2026-08-26T10:00:00.000Z'),
      updatedAt: new Date('2026-08-26T10:00:00.000Z'),
      ...overrides
    }) as Product

  beforeEach(async () => {
    jest.clearAllMocks()

    mockProductRepository.create.mockImplementation(data => ({ ...data }))
    mockProductRepository.save.mockImplementation(async entity => ({
      id: 'generated-product-id',
      ...entity
    }))
    mockProductRepository.findOne.mockResolvedValue(null)
    mockBatchRepository.create.mockImplementation(data => ({ ...data }))
    mockBatchRepository.save.mockImplementation(async batch => ({
      id: 'generated-batch-id',
      ...batch
    }))

    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<ImportService>(ImportService)
  })

  describe('file validation', () => {
    it('rejects a missing file', async () => {
      await expect(service.importCsv(undefined)).rejects.toThrow(
        BadRequestException
      )
    })

    it('rejects a non-.csv extension', async () => {
      const file = csvFile([], { originalname: 'products.xlsx' })
      await expect(service.importCsv(file)).rejects.toThrow(
        'Only .csv files are allowed'
      )
    })

    it('rejects an unsupported MIME type', async () => {
      const file = csvFile([], { mimetype: 'application/pdf' })
      await expect(service.importCsv(file)).rejects.toThrow(BadRequestException)
    })

    it('accepts application/vnd.ms-excel for a .csv file', async () => {
      const file = csvFile(
        ['Running Shoes,RS-001,desc,Footwear,89.99,150,0.35'],
        { mimetype: 'application/vnd.ms-excel' }
      )
      const result = await service.importCsv(file)
      expect(result.summary.inserted).toBe(1)
    })

    it('rejects a CSV missing required columns with 400', async () => {
      const content = 'name,sku,price\nA,B,1'
      const file = csvFile([], {
        buffer: Buffer.from(content, 'utf8'),
        size: content.length
      })
      await expect(service.importCsv(file)).rejects.toThrow(
        'CSV is missing required columns: description, category, stock, weight_kg'
      )
    })
  })

  describe('price normalization', () => {
    it("cleans currency symbols: '$29.99' is accepted as 29.99", async () => {
      const result = await service.importCsv(
        csvFile(['Wireless Mouse,WM-042,desc,Electronics,$29.99,75,0.12'])
      )

      expect(result.summary.inserted).toBe(1)
      expect(result.rejected).toHaveLength(0)
      expect(mockProductRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ price: '29.99' })
      )
    })

    it("rejects a non-numeric price: 'free'", async () => {
      const result = await service.importCsv(
        csvFile(['Yoga Mat,YM-015,desc,Sports,free,200,1.2'])
      )

      expect(result.summary.inserted).toBe(0)
      expect(result.summary.rejected).toBe(1)
      expect(result.rejected[0]).toEqual({
        line: 2,
        sku: 'YM-015',
        name: 'Yoga Mat',
        errors: ["price is not a valid number: 'free'"]
      })
    })

    it("accepts a price with surrounding whitespace: '  19.99 '", async () => {
      const result = await service.importCsv(
        csvFile(['"Desk Mat",DM-012,desc,Home,"  19.99 ",175,0.6'])
      )

      expect(result.summary.inserted).toBe(1)
      expect(mockProductRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ price: '19.99' })
      )
    })
  })

  describe('row handling', () => {
    it('skips fully empty rows without counting them as errors', async () => {
      const result = await service.importCsv(
        csvFile([',,,,,,', 'Running Shoes,RS-001,desc,Footwear,89.99,150,0.35'])
      )

      expect(result.summary).toEqual(
        expect.objectContaining({
          totalRows: 2,
          inserted: 1,
          skippedEmpty: 1,
          rejected: 0
        })
      )
    })

    it('reports which lines were skipped, not just how many', async () => {
      const result = await service.importCsv(
        csvFile([
          ',,,,,,',
          'Running Shoes,RS-001,desc,Footwear,89.99,150,0.35',
          ',,,,,,'
        ])
      )

      expect(result.summary.skippedEmpty).toBe(2)
      expect(result.skipped).toEqual([{ line: 2 }, { line: 4 }])
    })

    it("applies the 'Uncategorized' default when category is empty", async () => {
      const result = await service.importCsv(
        csvFile(['Gift Card,GC-025,desc,,25.00,99999,0'])
      )

      expect(result.summary.inserted).toBe(1)
      expect(mockProductRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Uncategorized' })
      )
    })

    it('stores an empty weight_kg as null, never 0', async () => {
      const result = await service.importCsv(
        csvFile(['Gaming Keyboard,GK-088,desc,Electronics,129.99,45,'])
      )

      expect(result.summary.inserted).toBe(1)
      const created = mockProductRepository.create.mock.calls[0][0]
      expect(created.weightKg).toBeUndefined()
    })

    it('rejects an XSS payload in the name instead of sanitizing it', async () => {
      const result = await service.importCsv(
        csvFile([
          "<script>alert('xss')</script>,XS-001,desc,Electronics,19.99,100,0.1"
        ])
      )

      expect(result.summary.inserted).toBe(0)
      // The offending name travels with the row, so the report shows what was wrong.
      expect(result.rejected[0]).toEqual({
        line: 2,
        sku: 'XS-001',
        name: "<script>alert('xss')</script>",
        errors: ['name contains invalid content: HTML markup is not allowed']
      })
      expect(mockProductRepository.create).not.toHaveBeenCalled()
    })

    it('rejects a negative stock with the validator message', async () => {
      const result = await service.importCsv(
        csvFile(['Desk Lamp,DL-007,desc,Home,45.50,-5,2.1'])
      )

      expect(result.rejected[0]).toEqual({
        line: 2,
        sku: 'DL-007',
        name: 'Desk Lamp',
        errors: ['stock must not be less than 0']
      })
    })
  })

  describe('upsert by sku', () => {
    it('inserts when the sku does not exist', async () => {
      const result = await service.importCsv(
        csvFile(['Running Shoes,RS-001,desc,Footwear,89.99,150,0.35'])
      )

      expect(result.summary).toEqual(
        expect.objectContaining({ inserted: 1, updated: 0, unchanged: 0 })
      )
      expect(result.warnings).toHaveLength(0)
      expect(result.created).toEqual([
        expect.objectContaining({
          line: 2,
          sku: 'RS-001',
          name: 'Running Shoes',
          category: 'Footwear',
          stock: 150
        })
      ])
    })

    it('counts unchanged when all imported fields are identical', async () => {
      mockProductRepository.findOne.mockResolvedValue(existingProduct())

      const result = await service.importCsv(
        csvFile([
          'Running Shoes,RS-001,Lightweight running shoes for daily training,Footwear,89.99,150,0.35'
        ])
      )

      expect(result.summary).toEqual(
        expect.objectContaining({ inserted: 0, updated: 0, unchanged: 1 })
      )
      expect(result.warnings).toHaveLength(0)
      expect(result.created).toHaveLength(0)
      expect(mockProductRepository.save).not.toHaveBeenCalled()
      expect(mockProductRepository.create).not.toHaveBeenCalled()
    })

    it('updates with a warning when the sku exists with different data', async () => {
      mockProductRepository.findOne.mockResolvedValue(existingProduct())

      const result = await service.importCsv(
        csvFile([
          'Running Shoes,RS-001,Updated lightweight shoes,Footwear,94.99,120,0.35'
        ])
      )

      expect(result.summary).toEqual(
        expect.objectContaining({ inserted: 0, updated: 1, unchanged: 0 })
      )
      expect(result.warnings).toEqual([
        {
          line: 2,
          sku: 'RS-001',
          message: 'sku already exists with different data — updated'
        }
      ])
      expect(mockProductRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ price: '94.99', stock: 120 })
      )
    })

    it('rejects every row of a sku duplicated in the file with conflicting data', async () => {
      const result = await service.importCsv(
        csvFile([
          'Bluetooth Speaker,BS-021,Portable speaker,Electronics,59.99,110,0.8',
          'Bluetooth Speaker,BS-021,Same SKU different price,Electronics,49.99,200,0.75'
        ])
      )

      expect(result.summary).toEqual(
        expect.objectContaining({
          inserted: 0,
          updated: 0,
          unchanged: 0,
          rejected: 2
        })
      )
      expect(result.rejected.map(row => row.line)).toEqual([2, 3])
      expect(result.rejected[0].errors[0]).toContain('duplicate sku in the file')
      expect(result.rejected[0].errors[0]).toContain('conflicting data')
      expect(result.warnings).toEqual([])
      expect(mockProductRepository.create).not.toHaveBeenCalled()
      expect(mockProductRepository.save).not.toHaveBeenCalled()
    })

    it('rejects a sku duplicated with identical data and says so in the message', async () => {
      const row = 'Bluetooth Speaker,BS-021,Portable speaker,Electronics,59.99,110,0.8'
      const result = await service.importCsv(csvFile([row, row]))

      expect(result.summary).toEqual(
        expect.objectContaining({ inserted: 0, rejected: 2 })
      )
      expect(result.rejected[0].errors[0]).toContain('identical data')
      expect(mockProductRepository.create).not.toHaveBeenCalled()
    })

    it('keeps importing the rows whose sku is not duplicated', async () => {
      const result = await service.importCsv(
        csvFile([
          'Camping Tent,CT-005,Tent,Outdoors,199.99,25,4.5',
          'Bluetooth Speaker,BS-021,Portable speaker,Electronics,59.99,110,0.8',
          'Bluetooth Speaker,BS-021,Same SKU different price,Electronics,49.99,200,0.75'
        ])
      )

      expect(result.summary).toEqual(
        expect.objectContaining({ inserted: 1, rejected: 2 })
      )
      expect(result.created).toEqual([
        expect.objectContaining({
          line: 2,
          sku: 'CT-005',
          name: 'Camping Tent',
          category: 'Outdoors'
        })
      ])
    })
  })

  describe('batch persistence', () => {
    it('creates the batch as processing and completes it with counters and report', async () => {
      const result = await service.importCsv(
        csvFile([
          'Running Shoes,RS-001,desc,Footwear,89.99,150,0.35',
          'Yoga Mat,YM-015,desc,Sports,free,200,1.2'
        ])
      )

      expect(result.batchId).toBe('generated-batch-id')
      expect(mockBatchRepository.create).toHaveBeenCalledWith({
        filename: 'products.csv',
        status: 'processing',
        importedBy: null
      })

      const saveCalls = mockBatchRepository.save.mock.calls
      const finalSave = saveCalls[saveCalls.length - 1][0]
      expect(finalSave).toEqual(
        expect.objectContaining({
          status: 'completed',
          totalRows: 2,
          inserted: 1,
          rejected: 1,
          report: {
            rejected: [
              {
                line: 3,
                sku: 'YM-015',
                errors: ["price is not a valid number: 'free'"]
              }
            ],
            warnings: [],
            created: [
              expect.objectContaining({
                line: 2,
                sku: 'RS-001',
                name: 'Running Shoes',
                category: 'Footwear',
                price: '89.99',
                stock: 150
              })
            ]
          }
        })
      )
    })
  })
})
