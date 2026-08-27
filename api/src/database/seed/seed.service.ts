import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Product } from '@/modules/products/entities/product.entity'
import { ImportService } from '@/modules/products/import/import.service'

const SEED_CSV_FILENAME = 'loanpro-sample.csv'

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name)

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly importService: ImportService
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      if (process.env.SEED_ON_BOOT === 'false') {
        this.logger.log('Seed skipped: SEED_ON_BOOT=false')
        return
      }

      const count = await this.productRepository.count()
      if (count > 0) {
        this.logger.log(
          `Seed skipped: products table already has ${count} rows`
        )
        return
      }

      const csvPath = this.resolveCsvPath()
      if (!csvPath) {
        this.logger.error(
          `Seed aborted: ${SEED_CSV_FILENAME} not found next to the seed module`
        )
        return
      }

      const buffer = readFileSync(csvPath)
      const file = {
        originalname: SEED_CSV_FILENAME,
        mimetype: 'text/csv',
        buffer,
        size: buffer.length
      } as Express.Multer.File

      const result = await this.importService.importCsv(file)
      this.logger.log(
        `Seed completed (batch ${result.batchId}): ` +
          `${result.summary.inserted} inserted, ${result.summary.updated} updated, ` +
          `${result.summary.rejected} rejected, ${result.summary.skippedEmpty} skipped empty`
      )
    } catch (error) {
      this.logger.error('Seed failed, application continues without seed data')
      this.logger.error(error)
    }
  }

  private resolveCsvPath(): string | null {
    const candidates = [
      join(__dirname, SEED_CSV_FILENAME),
      join(process.cwd(), 'src', 'database', 'seed', SEED_CSV_FILENAME)
    ]
    return candidates.find(path => existsSync(path)) ?? null
  }
}
