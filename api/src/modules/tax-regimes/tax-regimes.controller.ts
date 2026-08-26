import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query
} from '@nestjs/common'
import { ApiQuery, ApiTags } from '@nestjs/swagger'
import { ParseUUIDPipe } from '@nestjs/common'

import { TaxRegimesService } from './tax-regimes.service'
import { CreateTaxRegimeDto } from './dto/create-tax-regime.dto'
import { UpdateTaxRegimeDto } from './dto/update-tax-regime.dto'
import { PaginationDTO } from '@/common/dto/pagination.dto'

@ApiTags('tax-regimes')
@Controller('tax-regimes')
export class TaxRegimesController {
  constructor(private readonly taxRegimesService: TaxRegimesService) {}

  @Post()
  create(@Body() dto: CreateTaxRegimeDto) {
    return this.taxRegimesService.create(dto)
  }

  @Get()
  @ApiQuery({
    name: 'taxProfileId',
    required: false,
    description: 'Filter by tax profile id',
    type: String,
    format: 'uuid'
  })
  findAll(
    @Query() pagination: PaginationDTO,
    @Query('taxProfileId', new ParseUUIDPipe({ version: '4', optional: true }))
    taxProfileId?: string
  ) {
    return this.taxRegimesService.findAll(pagination, taxProfileId)
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.taxRegimesService.findOne(id)
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTaxRegimeDto
  ) {
    return this.taxRegimesService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.taxRegimesService.remove(id)
  }
}
