import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ValidationPipe
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { parse } from 'csv-parse/sync'

import { CreateProductDto } from '@/modules/products/dto/create-product.dto'
import { Product } from '@/modules/products/entities/product.entity'
import { ProductsService } from '@/modules/products/products.service'
import { ImportBatch } from './import-batch.entity'
import { ImportRowNormalizer } from './import-row.normalizer'
import {
  ImportRejectedRow,
  ImportResult,
  ImportSummary,
  ImportWarning
} from './import-result.interface'
import { PaginationDTO } from '@/common/dto/pagination.dto'
import { PaginationHelper } from '@/common/pagination/pagination.helper'
import { PaginationResponseBuilder } from '@/common/pagination/pagination-response.builder'

const EXPECTED_HEADERS = [
  'name',
  'sku',
  'description',
  'category',
  'price',
  'stock',
  'weight_kg'
]
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/octet-stream'
]

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name)

  private readonly rowValidationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true
    }
  })

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ImportBatch)
    private readonly batchRepository: Repository<ImportBatch>,
    private readonly productsService: ProductsService,
    private readonly normalizer: ImportRowNormalizer,
    private readonly paginationBuilder: PaginationResponseBuilder<ImportBatch>
  ) {}

  async importCsv(
    file: Express.Multer.File,
    importedBy?: string
  ): Promise<ImportResult> {
    this.validateFile(file)
    const records = this.parseCsv(file.buffer)

    const batch = await this.batchRepository.save(
      this.batchRepository.create({
        filename: file.originalname,
        status: 'processing',
        importedBy: importedBy ?? null
      })
    )

    try {
      const result = await this.processRows(records)

      Object.assign(batch, result.summary, {
        status: 'completed',
        report: { rejected: result.rejected, warnings: result.warnings }
      })
      await this.batchRepository.save(batch)

      return { batchId: batch.id, ...result }
    } catch (error) {
      this.logger.error(error)
      batch.status = 'failed'
      await this.batchRepository.save(batch)
      throw new InternalServerErrorException(
        'Unexpected error while processing the import, check server logs'
      )
    }
  }

  async findAllBatches(paginationDto: PaginationDTO) {
    const { page, limit, offset } = PaginationHelper.parse(paginationDto)

    const [batches, total] = await this.batchRepository.findAndCount({
      select: [
        'id',
        'filename',
        'status',
        'totalRows',
        'inserted',
        'updated',
        'unchanged',
        'rejected',
        'skippedEmpty',
        'importedBy',
        'createdAt'
      ],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset
    })

    return this.paginationBuilder.build(batches, total, page, limit)
  }

  async findBatch(id: string): Promise<ImportBatch> {
    const batch = await this.batchRepository.findOneBy({ id })

    if (!batch)
      throw new NotFoundException(`Import batch with id '${id}' not found`)

    return batch
  }

  private validateFile(file: Express.Multer.File | undefined): void {
    if (!file) throw new BadRequestException('file is required')

    if (!/\.csv$/i.test(file.originalname))
      throw new BadRequestException('Only .csv files are allowed')

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype))
      throw new BadRequestException(
        `Unsupported file type '${file.mimetype}', expected text/csv`
      )

    if (!file.buffer || file.buffer.length === 0)
      throw new BadRequestException('CSV file is empty')
  }

  private parseCsv(buffer: Buffer): Record<string, unknown>[] {
    try {
      return parse(buffer, {
        columns: headers => this.validateHeaders(headers),
        bom: true,
        skip_empty_lines: false,
        relax_column_count: true
      })
    } catch (error) {
      if (error instanceof BadRequestException) throw error
      const message = error instanceof Error ? error.message : 'unknown error'
      throw new BadRequestException(`Malformed CSV: ${message}`)
    }
  }

  private validateHeaders(headers: string[]): string[] {
    const normalized = headers.map(header => header.trim())
    const missing = EXPECTED_HEADERS.filter(
      header => !normalized.includes(header)
    )

    if (missing.length > 0)
      throw new BadRequestException(
        `CSV is missing required columns: ${missing.join(', ')}`
      )

    const unexpected = normalized.filter(
      header => !EXPECTED_HEADERS.includes(header)
    )

    if (unexpected.length > 0)
      throw new BadRequestException(
        `CSV has unexpected columns: ${unexpected.join(', ')}`
      )

    return normalized
  }

  private async processRows(records: Record<string, unknown>[]) {
    const summary: ImportSummary = {
      totalRows: records.length,
      inserted: 0,
      updated: 0,
      unchanged: 0,
      rejected: 0,
      skippedEmpty: 0
    }
    const rejected: ImportRejectedRow[] = []
    const warnings: ImportWarning[] = []
    const processedBySku = new Map<string, Product>()

    for (let index = 0; index < records.length; index++) {
      const line = index + 2
      const normalized = this.normalizer.normalize(records[index])

      if (normalized.isEmpty) {
        summary.skippedEmpty++
        continue
      }

      if (normalized.errors.length > 0) {
        rejected.push({ line, sku: normalized.sku, errors: normalized.errors })
        continue
      }

      let dto: CreateProductDto
      try {
        dto = await this.rowValidationPipe.transform(normalized.values, {
          type: 'body',
          metatype: CreateProductDto
        })
      } catch (error) {
        rejected.push({
          line,
          sku: normalized.sku,
          errors: this.extractValidationMessages(error)
        })
        continue
      }

      dto.category = dto.category?.trim() || 'Uncategorized'

      try {
        const existing =
          processedBySku.get(dto.sku) ??
          (await this.productRepository.findOne({ where: { sku: dto.sku } }))

        if (!existing) {
          const created = await this.productsService.create(dto)
          processedBySku.set(dto.sku, created)
          summary.inserted++
        } else if (this.isIdentical(existing, dto)) {
          processedBySku.set(dto.sku, existing)
          summary.unchanged++
        } else {
          const saved = await this.productRepository.save(
            this.applyDtoToEntity(existing, dto)
          )
          processedBySku.set(dto.sku, saved)
          summary.updated++
          warnings.push({
            line,
            sku: dto.sku,
            message: 'sku already exists with different data — updated'
          })
        }
      } catch (error) {
        rejected.push({
          line,
          sku: dto.sku,
          errors: [
            error instanceof Error ? error.message : 'unexpected database error'
          ]
        })
      }
    }

    summary.rejected = rejected.length
    return { summary, rejected, warnings }
  }

  private extractValidationMessages(error: unknown): string[] {
    if (error instanceof BadRequestException) {
      const response = error.getResponse() as { message?: string | string[] }
      const message = response?.message ?? error.message
      return Array.isArray(message) ? message : [String(message)]
    }
    return [error instanceof Error ? error.message : 'invalid row']
  }

  private isIdentical(existing: Product, dto: CreateProductDto): boolean {
    return (
      existing.name === dto.name &&
      (existing.description ?? null) === (dto.description ?? null) &&
      existing.category === dto.category &&
      Number(existing.price).toFixed(2) === dto.price.toFixed(2) &&
      existing.stock === dto.stock &&
      this.isSameWeight(existing.weightKg, dto.weightKg)
    )
  }

  private isSameWeight(
    existing: string | null | undefined,
    incoming: number | undefined
  ): boolean {
    if (existing == null) return incoming === undefined
    if (incoming === undefined) return false
    return Number(existing) === incoming
  }

  private applyDtoToEntity(existing: Product, dto: CreateProductDto): Product {
    existing.name = dto.name
    existing.description = dto.description ?? null
    existing.category = dto.category
    existing.price = dto.price.toFixed(2)
    existing.stock = dto.stock
    existing.weightKg =
      dto.weightKg === undefined ? null : dto.weightKg.toString()
    return existing
  }
}
