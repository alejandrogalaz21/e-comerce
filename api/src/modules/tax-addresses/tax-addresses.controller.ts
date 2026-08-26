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

import { TaxAddressesService } from './tax-addresses.service'
import { CreateTaxAddressDto } from './dto/create-tax-address.dto'
import { UpdateTaxAddressDto } from './dto/update-tax-address.dto'
import { PaginationDTO } from '@/common/dto/pagination.dto'

@ApiTags('tax-addresses')
@Controller('tax-addresses')
export class TaxAddressesController {
  constructor(private readonly taxAddressesService: TaxAddressesService) {}

  @Post()
  create(@Body() dto: CreateTaxAddressDto) {
    return this.taxAddressesService.create(dto)
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
    return this.taxAddressesService.findAll(pagination, taxProfileId)
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.taxAddressesService.findOne(id)
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTaxAddressDto
  ) {
    return this.taxAddressesService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.taxAddressesService.remove(id)
  }
}
