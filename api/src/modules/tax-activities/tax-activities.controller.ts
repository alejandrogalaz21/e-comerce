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

import { TaxActivitiesService } from './tax-activities.service'
import { CreateTaxActivityDto } from './dto/create-tax-activity.dto'
import { UpdateTaxActivityDto } from './dto/update-tax-activity.dto'
import { PaginationDTO } from '@/common/dto/pagination.dto'

@ApiTags('tax-activities')
@Controller('tax-activities')
export class TaxActivitiesController {
  constructor(private readonly taxActivitiesService: TaxActivitiesService) {}

  @Post()
  create(@Body() dto: CreateTaxActivityDto) {
    return this.taxActivitiesService.create(dto)
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
    return this.taxActivitiesService.findAll(pagination, taxProfileId)
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.taxActivitiesService.findOne(id)
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTaxActivityDto
  ) {
    return this.taxActivitiesService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.taxActivitiesService.remove(id)
  }
}
