import { applyDecorators } from '@nestjs/common'
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse
} from '@nestjs/swagger'

import {
  ApiInvalidUuidResponse,
  ApiPaginationQuery
} from '@/common/swagger/api-responses'

import { ImportBatch } from '../import-batch.entity'
import { IMPORT_RESULT_EXAMPLE } from './import-report.example'

export const ApiImportCsv = (maxFileSizeMb: number) =>
  applyDecorators(
    ApiOperation({
      summary: 'Import products from a CSV file (upsert by SKU)'
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['file'],
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: `CSV file (max ${maxFileSizeMb}MB) with headers: name,sku,description,category,price,stock,weight_kg`
          }
        }
      }
    }),
    ApiResponse({
      status: 201,
      description: 'Import processed (partial import: bad rows never abort it)',
      schema: { example: IMPORT_RESULT_EXAMPLE }
    }),
    ApiResponse({
      status: 400,
      description:
        'File-level problem: missing file, not a .csv, bad MIME type, empty file, malformed CSV, missing required columns or unexpected columns'
    }),
    ApiResponse({
      status: 413,
      description: `File larger than ${maxFileSizeMb}MB`
    })
  )

export const ApiListImportBatches = () =>
  applyDecorators(
    ApiOperation({ summary: 'List import batches with pagination and search' }),
    ApiPaginationQuery(10),
    ApiQuery({
      name: 'q',
      required: false,
      example: 'loanpro',
      description:
        'Free-text search, case-insensitive, matched against filename'
    }),
    ApiResponse({
      status: 200,
      description:
        'Paginated list without the heavy report field: { data: ImportBatch[], pagination: { total, per_page, current_page, last_page, from, to } }'
    })
  )

export const ApiGetImportBatch = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get an import batch with its full report' }),
    ApiResponse({
      status: 200,
      description: 'Import batch found',
      type: ImportBatch
    }),
    ApiInvalidUuidResponse(),
    ApiResponse({ status: 404, description: 'Import batch not found' })
  )
