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

import { TaxProfile } from './entities/tax-profile.entity'
import { CreateTaxProfileDto } from './dto/create-tax-profile.dto'
import { UpdateTaxProfileDto } from './dto/update-tax-profile.dto'
import { Client } from '@/modules/clients/entities/client.entity'

@Injectable()
export class TaxProfilesService {
  private readonly logger = new Logger('TaxProfilesService')

  constructor(
    @InjectRepository(TaxProfile)
    private readonly taxProfileRepo: Repository<TaxProfile>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    private readonly paginationBuilder: PaginationResponseBuilder<TaxProfile>
  ) {}

  async create(dto: CreateTaxProfileDto) {
    const client = await this.clientRepo.findOne({
      where: { id: dto.clientId }
    })
    if (!client) throw new NotFoundException(`Client ${dto.clientId} not found`)

    try {
      const entity = this.taxProfileRepo.create({
        client,
        rfc: dto.rfc,
        commercialName: dto.commercialName,
        status: dto.status,
        startOperations: dto.startOperations
      })

      return await this.taxProfileRepo.save(entity)
    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async findAll(pagination: PaginationDTO, clientId?: string) {
    const { page, limit, offset } = PaginationHelper.parse(pagination)

    const where = clientId ? { client: { id: clientId } } : {}

    const [items, total] = await this.taxProfileRepo.findAndCount({
      where,
      take: limit,
      skip: offset,
      relations: ['client', 'addresses', 'regimes', 'activities', 'obligations']
    })

    return this.paginationBuilder.build(items, total, page, limit)
  }

  async findOne(id: string) {
    const profile = await this.taxProfileRepo.findOne({
      where: { id },
      relations: ['client', 'addresses', 'regimes', 'activities', 'obligations']
    })

    if (!profile) throw new NotFoundException(`Tax profile ${id} not found`)

    return profile
  }

  async update(id: string, dto: UpdateTaxProfileDto) {
    const profile = await this.taxProfileRepo.findOne({ where: { id } })
    if (!profile) throw new NotFoundException(`Tax profile ${id} not found`)

    Object.assign(profile, dto)

    try {
      return await this.taxProfileRepo.save(profile)
    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async remove(id: string) {
    const existing = await this.taxProfileRepo.findOne({ where: { id } })
    if (!existing) throw new NotFoundException(`Tax profile ${id} not found`)

    await this.taxProfileRepo.remove(existing)
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
