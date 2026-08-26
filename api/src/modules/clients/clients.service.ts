import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { PaginationDTO } from '@/common/dto/pagination.dto'
import { PaginationHelper } from '@/common/pagination/pagination.helper'
import { PaginationResponseBuilder } from '@/common/pagination/pagination-response.builder'

import { Client } from './entities/client.entity'
import { CreateClientDto } from './dto/create-client.dto'
import { UpdateClientDto } from './dto/update-client.dto'

@Injectable()
export class ClientsService {
  private readonly logger = new Logger('ClientsService')

  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    private readonly paginationBuilder: PaginationResponseBuilder<Client>
  ) {}

  async create(dto: CreateClientDto) {
    try {
      const entity = this.clientRepo.create(dto)
      return await this.clientRepo.save(entity)
    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async findAll(pagination: PaginationDTO) {
    const { page, limit, offset } = PaginationHelper.parse(pagination)

    const [items, total] = await this.clientRepo.findAndCount({
      take: limit,
      skip: offset,
      relations: ['credential', 'taxProfiles']
    })

    return this.paginationBuilder.build(items, total, page, limit)
  }

  async findOne(id: string) {
    const client = await this.clientRepo.findOne({
      where: { id },
      relations: ['credential', 'taxProfiles']
    })

    if (!client) throw new NotFoundException(`Client ${id} not found`)

    return client
  }

  async update(id: string, dto: UpdateClientDto) {
    const entity = await this.clientRepo.preload({ id, ...dto })
    if (!entity) throw new NotFoundException(`Client ${id} not found`)

    try {
      return await this.clientRepo.save(entity)
    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async remove(id: string) {
    const existing = await this.findOne(id)
    await this.clientRepo.remove(existing)
    return { id, deleted: true }
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail)

    this.logger.error(error)
    throw new InternalServerErrorException(
      'Unexpected error, check server logs'
    )
  }
}
