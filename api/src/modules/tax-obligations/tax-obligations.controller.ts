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

import { TaxObligationsService } from './tax-obligations.service'
import { CreateTaxObligationDto } from './dto/create-tax-obligation.dto'
import { UpdateTaxObligationDto } from './dto/update-tax-obligation.dto'
import { PaginationDTO } from '@/common/dto/pagination.dto'

@ApiTags('tax-obligations')
@Controller('tax-obligations')
export class TaxObligationsController {
  constructor(private readonly taxObligationsService: TaxObligationsService) {}

  @Post()
  create(@Body() dto: CreateTaxObligationDto) {
    return this.taxObligationsService.create(dto)
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
    return this.taxObligationsService.findAll(pagination, taxProfileId)
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.taxObligationsService.findOne(id)
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTaxObligationDto
  ) {
    return this.taxObligationsService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.taxObligationsService.remove(id)
  }
}
