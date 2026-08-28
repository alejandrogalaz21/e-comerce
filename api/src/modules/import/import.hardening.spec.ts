import { readFileSync } from 'fs'
import { join } from 'path'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import {
  BadRequestException,
  InternalServerErrorException
} from '@nestjs/common'

import { ImportService } from './import.service'
import { ImportRowNormalizer } from './import-row.normalizer'
import { ImportBatch } from './import-batch.entity'
import { Product } from '@/modules/products/entities/product.entity'
import { ProductsService } from '@/modules/products/products.service'
import { PaginationResponseBuilder } from '@/common/pagination/pagination-response.builder'

const CSV_HEADER = 'name,sku,description,category,price,stock,weight_kg'

function fileFrom(
  buffer: Buffer,
  overrides: Partial<Express.Multer.File> = {}
): Express.Multer.File {
  return {
    originalname: 'products.csv',
    mimetype: 'text/csv',
    buffer,
    size: buffer.length,
    ...overrides
  } as Express.Multer.File
}

function csvFile(content: string): Express.Multer.File {
  return fileFrom(Buffer.from(content, 'utf8'))
}

describe('ImportService (adversarial input hardening)', () => {
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

  describe('malformed CSV structure', () => {
    it('rejects an unclosed quote with a 400 and creates no batch row', async () => {
      const file = csvFile(`${CSV_HEADER}\n"broken,X-1,desc,Cat,10,5,1`)

      await expect(service.importCsv(file)).rejects.toThrow(BadRequestException)
      await expect(service.importCsv(file)).rejects.toThrow(/^Malformed CSV: /)
      expect(mockBatchRepository.create).not.toHaveBeenCalled()
      expect(mockBatchRepository.save).not.toHaveBeenCalled()
    })

    it('never converts a parse failure into a 500', async () => {
      const file = csvFile(`${CSV_HEADER}\n"a"b",X-1,d,C,1,1,1`)

      await expect(service.importCsv(file)).rejects.not.toThrow(
        InternalServerErrorException
      )
      await expect(service.importCsv(file)).rejects.toThrow(BadRequestException)
    })
  })

  describe('header contract', () => {
    it('lists every missing required column in the 400 message', async () => {
      const file = csvFile('name,sku,price\nA,B,1')

      await expect(service.importCsv(file)).rejects.toThrow(
        'CSV is missing required columns: description, category, stock, weight_kg'
      )
    })

    it('rejects unknown extra columns listing them', async () => {
      const file = csvFile(`${CSV_HEADER},hacked\nA,A-1,d,C,1,1,1,payload`)

      await expect(service.importCsv(file)).rejects.toThrow(
        'CSV has unexpected columns: hacked'
      )
      expect(mockBatchRepository.save).not.toHaveBeenCalled()
    })

    it('accepts any column order (columns are keyed by name)', async () => {
      const file = csvFile(
        'stock,price,sku,weight_kg,name,category,description\n' +
          '150,89.99,RS-001,0.35,Running Shoes,Footwear,desc'
      )

      const result = await service.importCsv(file)

      expect(result.summary.inserted).toBe(1)
      expect(result.rejected).toHaveLength(0)
      expect(mockProductRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: 'RS-001',
          name: 'Running Shoes',
          stock: 150
        })
      )
    })
  })

  describe('degenerate files', () => {
    it('accepts a header-only file as an empty batch', async () => {
      const result = await service.importCsv(csvFile(CSV_HEADER))

      expect(result.summary).toEqual({
        totalRows: 0,
        inserted: 0,
        updated: 0,
        unchanged: 0,
        rejected: 0,
        skippedEmpty: 0
      })
      expect(result.batchId).toBe('generated-batch-id')
      expect(result.created).toEqual([])
    })

    it('rejects a completely empty file (0 bytes) with a 400', async () => {
      const file = fileFrom(Buffer.alloc(0))

      await expect(service.importCsv(file)).rejects.toThrow('CSV file is empty')
      expect(mockBatchRepository.save).not.toHaveBeenCalled()
    })

    it('rejects binary garbage renamed to .csv with a 400, never a 500', async () => {
      const pngBytes = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x22, 0x01, 0x02, 0x03
      ])
      const file = fileFrom(pngBytes)

      await expect(service.importCsv(file)).rejects.toThrow(BadRequestException)
      expect(mockBatchRepository.save).not.toHaveBeenCalled()
    })
  })

  describe('ragged rows (cell count differs from header count)', () => {
    it('rejects a row with fewer cells than headers via field errors', async () => {
      const result = await service.importCsv(
        csvFile(`${CSV_HEADER}\nLonely Cell`)
      )

      expect(result.summary.rejected).toBe(1)
      expect(result.summary.inserted).toBe(0)
      expect(result.rejected[0].errors).toEqual(
        expect.arrayContaining([
          "price is not a valid number: ''",
          "stock is not a valid number: ''"
        ])
      )
    })

    it('ignores extra cells beyond the headers and still imports the row', async () => {
      const result = await service.importCsv(
        csvFile(
          `${CSV_HEADER}\nRunning Shoes,RS-001,desc,Footwear,89.99,150,0.35,EXTRA,MORE`
        )
      )

      expect(result.summary.inserted).toBe(1)
      expect(result.rejected).toHaveLength(0)
      expect(mockProductRepository.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ EXTRA: expect.anything() })
      )
    })
  })

  describe('hostile cell values', () => {
    it('rejects malicious cells and still returns a partial-import result', async () => {
      const hostileRows = [
        '"<script>alert(1)</script>Chair",XS-001,desc,Home,10.00,5,1',
        `"'; DROP TABLE products; --",SQL-002,desc,Home,10.00,5,1`,
        `"${'A'.repeat(10000)}",BIG-003,desc,Home,10.00,5,1`
      ]
      const result = await service.importCsv(
        csvFile([CSV_HEADER, ...hostileRows].join('\n'))
      )

      expect(result.summary.totalRows).toBe(3)
      expect(result.summary.inserted).toBe(1)
      expect(result.summary.rejected).toBe(2)
      expect(mockProductRepository.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ sku: 'XS-001' })
      )
      expect(mockProductRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ sku: 'SQL-002' })
      )
      expect(result.rejected).toEqual([
        expect.objectContaining({
          line: 2,
          sku: 'XS-001',
          errors: expect.arrayContaining([
            'name contains invalid content: HTML markup is not allowed'
          ])
        }),
        expect.objectContaining({
          line: 4,
          sku: 'BIG-003',
          errors: expect.arrayContaining([
            expect.stringContaining('name must be shorter than or equal to 255')
          ])
        })
      ])
    })
  })

  describe('encodings and line endings', () => {
    it('imports a CRLF file with a UTF-8 BOM', async () => {
      const content =
        String.fromCharCode(0xfeff) +
        [CSV_HEADER, 'Running Shoes,RS-001,desc,Footwear,89.99,150,0.35'].join(
          '\r\n'
        )
      const result = await service.importCsv(csvFile(content))

      expect(result.summary.inserted).toBe(1)
      expect(result.rejected).toHaveLength(0)
      expect(mockProductRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ sku: 'RS-001' })
      )
    })

    it('processes the real challenge fixture end to end without a 500', async () => {
      const buffer = readFileSync(
        join(__dirname, '../../../test/fixtures/loanpro-sample.csv')
      )
      const result = await service.importCsv(
        fileFrom(buffer, { originalname: 'loanpro-sample.csv' })
      )

      expect(result.summary.totalRows).toBe(97)
      expect(result.summary.rejected).toBe(5)
      expect(result.summary.skippedEmpty).toBe(2)
      expect(result.created).toHaveLength(result.summary.inserted)
    })
  })
})
