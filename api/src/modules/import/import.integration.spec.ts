import { readFileSync } from 'fs'
import { join } from 'path'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'

import { ImportService } from './import.service'
import { ImportRowNormalizer } from './import-row.normalizer'
import { ImportBatch } from './import-batch.entity'
import { Product } from '@/modules/products/entities/product.entity'
import { ProductsService } from '@/modules/products/products.service'
import { PaginationResponseBuilder } from '@/common/pagination/pagination-response.builder'

/**
 * Runs the import service against the real challenge fixture
 * (test/fixtures/loanpro-sample.csv: header line 1 + 97 data rows, lines 2-98).
 *
 * Expected numbers derived from the fixture content:
 * - rejected by validation (5): line 7 (price 'free'), 16 (stock -5), 20 (HTML
 *   markup in name), 25 (empty name), 41 (whitespace-only name). Line 29 is
 *   ACCEPTED: its sku 'SQL-001' is valid and the SQLi payload lives in the
 *   name, which is harmless data.
 * - rejected as duplicate skus (5): RS-001 on lines 2 and 36, BS-021 on lines
 *   11, 56 and 89. A sku must appear at most once per file, so every occurrence
 *   is rejected instead of letting row order decide the winner.
 * - skippedEmpty (2): lines 62 and 63.
 * - updated: 0 — no accepted sku exists in the database beforehand.
 * - inserted: 97 - 10 - 2 = 85.
 */
describe('ImportService (integration with the real fixture)', () => {
  const fixturePath = join(
    __dirname,
    '../../../test/fixtures/loanpro-sample.csv'
  )

  let service: ImportService
  let productsBySku: Map<string, Product>
  let batches: ImportBatch[]

  beforeEach(async () => {
    productsBySku = new Map()
    batches = []
    let productSequence = 0

    const productRepository = {
      create: jest.fn(data => ({ ...data })),
      save: jest.fn(async entity => {
        const saved = {
          id: entity.id ?? `product-${++productSequence}`,
          ...entity
        }
        productsBySku.set(saved.sku, saved as Product)
        return saved
      }),
      findOne: jest.fn(async ({ where: { sku } }) => {
        return productsBySku.get(sku) ?? null
      })
    }

    const batchRepository = {
      create: jest.fn(data => ({ ...data })),
      save: jest.fn(async batch => {
        const saved = { id: batch.id ?? 'batch-1', ...batch }
        batches.push({ ...saved } as ImportBatch)
        return saved
      }),
      findAndCount: jest.fn(),
      findOneBy: jest.fn()
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        ImportRowNormalizer,
        ProductsService,
        PaginationResponseBuilder,
        { provide: getRepositoryToken(Product), useValue: productRepository },
        { provide: getRepositoryToken(ImportBatch), useValue: batchRepository }
      ]
    }).compile()

    service = module.get<ImportService>(ImportService)
  })

  const importFixture = () => {
    const buffer = readFileSync(fixturePath)
    return service.importCsv({
      originalname: 'loanpro-sample.csv',
      mimetype: 'text/csv',
      buffer,
      size: buffer.length
    } as Express.Multer.File)
  }

  it('produces the exact expected summary', async () => {
    const result = await importFixture()

    expect(result.summary).toEqual({
      totalRows: 97,
      inserted: 85,
      updated: 0,
      unchanged: 0,
      rejected: 10,
      skippedEmpty: 2
    })
  })

  it('lists one created row per inserted product', async () => {
    const result = await importFixture()

    expect(result.created).toHaveLength(result.summary.inserted)
    expect(new Set(result.created.map(row => row.sku)).size).toBe(
      result.summary.inserted
    )
    expect(result.created[0]).toEqual({
      line: 3,
      sku: 'CB-010',
      name: 'Organic Coffee Beans',
      description: 'Single origin, medium roast, 1kg bag',
      category: 'Food & Beverage',
      price: '18.75',
      stock: 500,
      weightKg: '1'
    })
    expect(result.created.map(row => row.sku)).not.toContain('RS-001')
    expect(result.created.map(row => row.sku)).not.toContain('BS-021')
    expect(result.created.map(row => row.line)).not.toContain(7)
  })

  it('rejects the 5 invalid rows and the 5 duplicate-sku rows', async () => {
    const result = await importFixture()

    expect(result.rejected.map(row => row.line)).toEqual([
      2, 7, 11, 16, 20, 25, 36, 41, 56, 89
    ])
    expect(result.rejected).toEqual([
      {
        line: 2,
        sku: 'RS-001',
        errors: [
          'duplicate sku in the file (lines 2, 36) with conflicting data — a sku must appear at most once per import'
        ]
      },
      {
        line: 7,
        sku: 'YM-015',
        name: 'Yoga Mat',
        errors: ["price is not a valid number: 'free'"]
      },
      {
        line: 11,
        sku: 'BS-021',
        errors: [
          'duplicate sku in the file (lines 11, 56, 89) with conflicting data — a sku must appear at most once per import'
        ]
      },
      {
        line: 16,
        sku: 'DL-007',
        name: 'Desk Lamp',
        errors: ['stock must not be less than 0']
      },
      {
        line: 20,
        sku: 'XS-001',
        name: "<script>alert('xss')</script>",
        errors: ['name contains invalid content: HTML markup is not allowed']
      },
      {
        line: 25,
        sku: 'HD-099',
        errors: ['name should not be empty']
      },
      {
        line: 36,
        sku: 'RS-001',
        errors: [
          'duplicate sku in the file (lines 2, 36) with conflicting data — a sku must appear at most once per import'
        ]
      },
      {
        line: 41,
        sku: 'WS-001',
        errors: ['name should not be empty']
      },
      {
        line: 56,
        sku: 'BS-021',
        errors: [
          'duplicate sku in the file (lines 11, 56, 89) with conflicting data — a sku must appear at most once per import'
        ]
      },
      {
        line: 89,
        sku: 'BS-021',
        errors: [
          'duplicate sku in the file (lines 11, 56, 89) with conflicting data — a sku must appear at most once per import'
        ]
      }
    ])
  })

  it('produces no update warnings: duplicates are rejected, not merged', async () => {
    const result = await importFixture()

    expect(result.warnings).toEqual([])
  })

  it('keeps duplicated skus out of the catalog entirely', async () => {
    await importFixture()

    expect(productsBySku.get('RS-001')).toBeUndefined()
    expect(productsBySku.get('BS-021')).toBeUndefined()

    // Same name, different sku: these are distinct products and must survive.
    expect(productsBySku.get('RS-050')).toBeDefined()
    expect(productsBySku.get('BS-099')).toBeDefined()
  })

  it('handles the tricky accepted rows as designed', async () => {
    await importFixture()

    expect(productsBySku.get('WM-042')).toEqual(
      expect.objectContaining({ price: '29.99' })
    )

    expect(productsBySku.has('XS-001')).toBe(false)

    expect(productsBySku.get('SQL-001')).toEqual(
      expect.objectContaining({
        name: "Robert'); DROP TABLE products;--",
        sku: 'SQL-001'
      })
    )

    expect(productsBySku.get('MB-001')).toEqual(
      expect.objectContaining({ price: '0.00' })
    )

    const keyboard = productsBySku.get('GK-088')
    expect(keyboard).toBeDefined()
    expect(keyboard.weightKg).toBeUndefined()

    expect(productsBySku.get('GC-025')).toEqual(
      expect.objectContaining({ category: 'Uncategorized', weightKg: '0' })
    )
  })

  it('persists the completed batch with the same counters and full report', async () => {
    const result = await importFixture()

    expect(batches[0]).toEqual(
      expect.objectContaining({
        filename: 'loanpro-sample.csv',
        status: 'processing'
      })
    )

    const finalBatch = batches[batches.length - 1]
    expect(finalBatch).toEqual(
      expect.objectContaining({
        status: 'completed',
        totalRows: 97,
        inserted: 85,
        updated: 0,
        unchanged: 0,
        rejected: 10,
        skippedEmpty: 2
      })
    )
    expect(finalBatch.report.rejected).toEqual(result.rejected)
    expect(finalBatch.report.warnings).toEqual(result.warnings)
    expect(finalBatch.report.created).toEqual(result.created)
  })
})
