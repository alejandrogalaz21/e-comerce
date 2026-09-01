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
import { Throttle } from '@nestjs/throttler'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '@/common/decorators/current-user.decorator'
import { ApiUnauthorizedResponse } from '@/common/swagger/api-responses'
import { THROTTLE } from '@/config'

import {
  ApiGetImportBatch,
  ApiImportCsv,
  ApiListImportBatches
} from './docs/import.api-docs'
import { ImportBatchFiltersDto } from './import-batch-filters.dto'
import { ImportService } from './import.service'

const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

@ApiTags('products import')
@ApiBearerAuth('jwt')
@ApiUnauthorizedResponse()
@Controller('products/import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post()
  @Throttle({ default: THROTTLE.import })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } })
  )
  @ApiImportCsv(MAX_FILE_SIZE_MB)
  import(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('email') email: string
  ) {
    return this.importService.importCsv(file, email)
  }

  @Get('batches')
  @ApiListImportBatches()
  findAllBatches(@Query() filters: ImportBatchFiltersDto) {
    return this.importService.findAllBatches(filters)
  }

  @Get('batches/:id')
  @ApiGetImportBatch()
  findBatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.importService.findBatch(id)
  }
}
