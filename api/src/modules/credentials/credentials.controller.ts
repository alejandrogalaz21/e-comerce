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

import { CredentialsService } from './credentials.service'
import { CreateCredentialDto } from './dto/create-credential.dto'
import { UpdateCredentialDto } from './dto/update-credential.dto'
import { PaginationDTO } from '@/common/dto/pagination.dto'
import { ParseUUIDPipe } from '@nestjs/common'

@ApiTags('credentials')
@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Post()
  create(@Body() dto: CreateCredentialDto) {
    return this.credentialsService.create(dto)
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
    return this.credentialsService.findAll(pagination, clientId)
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.credentialsService.findOne(id)
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCredentialDto
  ) {
    return this.credentialsService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.credentialsService.remove(id)
  }
}
