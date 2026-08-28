import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'

import { ImportService } from './import.service'
import { ImportBatch } from './import-batch.entity'
import { ImportBatchFiltersDto } from './import-batch-filters.dto'
import { CurrentUser } from '@/common/decorators/current-user.decorator'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

@ApiTags('products import')
@ApiBearerAuth('jwt')
@ApiResponse({ status: 401, description: 'Missing or invalid access token' })
@Controller('products/import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } })
  )
  @ApiOperation({ summary: 'Import products from a CSV file (upsert by SKU)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'CSV file (max 5MB) with headers: name,sku,description,category,price,stock,weight_kg'
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Import processed (partial import: bad rows never abort it)',
    schema: {
      example: {
        batchId: '0d6cd087-3f2e-4f30-b0aa-cf9c93b1c0d5',
        summary: {
          totalRows: 97,
          inserted: 85,
          updated: 0,
          unchanged: 0,
          rejected: 10,
          skippedEmpty: 2
        },
        rejected: [
          {
            line: 7,
            sku: 'YM-015',
            errors: ["price is not a valid number: 'free'"]
          },
          {
            line: 16,
            sku: 'DL-007',
            errors: ['stock must not be less than 0']
          },
          {
            line: 36,
            sku: 'RS-001',
            errors: [
              'duplicate sku in the file (lines 2, 36) with conflicting data — a sku must appear at most once per import'
            ]
          }
        ],
        warnings: [
          {
            line: 12,
            sku: 'CB-010',
            message: 'sku already exists with different data — updated'
          }
        ],
        created: [
          { line: 2, sku: 'RS-001', name: 'Running Shoes' },
          { line: 3, sku: 'WM-042', name: 'Wireless Mouse' }
        ]
      }
    }
  })
  @ApiResponse({
    status: 400,
    description:
      'File-level problem: missing file, not a .csv, bad MIME type, empty file, malformed CSV, missing required columns or unexpected columns'
  })
  @ApiResponse({ status: 413, description: 'File larger than 5MB' })
  import(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('email') email: string
  ) {
    return this.importService.importCsv(file, email)
  }

  @Get('batches')
  @ApiOperation({ summary: 'List import batches with pagination and search' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  @ApiQuery({
    name: 'q',
    required: false,
    example: 'loanpro',
    description: 'Free-text search, case-insensitive, matched against filename'
  })
  @ApiResponse({
    status: 200,
    description:
      'Paginated list without the heavy report field: { data: ImportBatch[], pagination: { total, per_page, current_page, last_page, from, to } }'
  })
  findAllBatches(@Query() filters: ImportBatchFiltersDto) {
    return this.importService.findAllBatches(filters)
  }

  @Get('batches/:id')
  @ApiOperation({ summary: 'Get an import batch with its full report' })
  @ApiResponse({
    status: 200,
    description: 'Import batch found',
    type: ImportBatch
  })
  @ApiResponse({ status: 400, description: 'Invalid UUID' })
  @ApiResponse({ status: 404, description: 'Import batch not found' })
  findBatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.importService.findBatch(id)
  }
}
