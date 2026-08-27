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
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'

import { ImportService } from './import.service'
import { ImportBatch } from './import-batch.entity'
import { PaginationDTO } from '@/common/dto/pagination.dto'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

@ApiTags('products import')
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
          inserted: 88,
          updated: 3,
          unchanged: 0,
          rejected: 4,
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
          }
        ],
        warnings: [
          {
            line: 36,
            sku: 'RS-001',
            message: 'sku already exists with different data — updated'
          }
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
  import(@UploadedFile() file: Express.Multer.File) {
    return this.importService.importCsv(file)
  }

  @Get('batches')
  @ApiOperation({ summary: 'List import batches with pagination' })
  @ApiResponse({
    status: 200,
    description:
      'Paginated list without the heavy report field: { data: ImportBatch[], pagination: { total, per_page, current_page, last_page, from, to } }'
  })
  findAllBatches(@Query() pagination: PaginationDTO) {
    return this.importService.findAllBatches(pagination)
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
