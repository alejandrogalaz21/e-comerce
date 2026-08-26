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

import { TaxProfilesService } from './tax-profiles.service'
import { CreateTaxProfileDto } from './dto/create-tax-profile.dto'
import { UpdateTaxProfileDto } from './dto/update-tax-profile.dto'
import { PaginationDTO } from '@/common/dto/pagination.dto'

@ApiTags('tax-profiles')
@Controller('tax-profiles')
export class TaxProfilesController {
  constructor(private readonly taxProfilesService: TaxProfilesService) {}

  @Post()
  create(@Body() dto: CreateTaxProfileDto) {
    return this.taxProfilesService.create(dto)
  }

  @Get()
  @ApiQuery({
    name: 'clientId',
    required: false,
    description: 'Filter by client id',
    type: String,
    format: 'uuid'
  })
  findAll(
    @Query() pagination: PaginationDTO,
    @Query('clientId', new ParseUUIDPipe({ version: '4', optional: true }))
    clientId?: string
  ) {
    return this.taxProfilesService.findAll(pagination, clientId)
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.taxProfilesService.findOne(id)
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTaxProfileDto
  ) {
    return this.taxProfilesService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.taxProfilesService.remove(id)
  }
}
