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

import { CreateTaxObligationDto } from './dto/create-tax-obligation.dto'
import { UpdateTaxObligationDto } from './dto/update-tax-obligation.dto'
import { TaxObligation } from './entities/tax-obligation.entity'
import { TaxProfile } from '@/modules/tax-profiles/entities/tax-profile.entity'

@Injectable()
export class TaxObligationsService {
  private readonly logger = new Logger('TaxObligationsService')

  constructor(
    @InjectRepository(TaxObligation)
    private readonly taxObligationRepo: Repository<TaxObligation>,
    @InjectRepository(TaxProfile)
    private readonly taxProfileRepo: Repository<TaxProfile>,
    private readonly paginationBuilder: PaginationResponseBuilder<TaxObligation>
  ) {}

  async create(dto: CreateTaxObligationDto) {
    const taxProfile = await this.taxProfileRepo.findOne({
      where: { id: dto.taxProfileId }
    })
    if (!taxProfile)
      throw new NotFoundException(`Tax profile ${dto.taxProfileId} not found`)

    try {
      const entity = this.taxObligationRepo.create({
        taxProfile,
        obligation: dto.obligation,
        description: dto.description
      })

      return await this.taxObligationRepo.save(entity)
    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async findAll(pagination: PaginationDTO, taxProfileId?: string) {
    const { page, limit, offset } = PaginationHelper.parse(pagination)

    const where = taxProfileId ? { taxProfile: { id: taxProfileId } } : {}

    const [items, total] = await this.taxObligationRepo.findAndCount({
      where,
      take: limit,
      skip: offset,
      relations: ['taxProfile']
    })

    return this.paginationBuilder.build(items, total, page, limit)
  }

  async findOne(id: string) {
    const obligation = await this.taxObligationRepo.findOne({
      where: { id },
      relations: ['taxProfile']
    })

    if (!obligation)
      throw new NotFoundException(`Tax obligation ${id} not found`)

    return obligation
  }

  async update(id: string, dto: UpdateTaxObligationDto) {
    const obligation = await this.taxObligationRepo.findOne({ where: { id } })
    if (!obligation)
      throw new NotFoundException(`Tax obligation ${id} not found`)

    Object.assign(obligation, dto)

    try {
      return await this.taxObligationRepo.save(obligation)
    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async remove(id: string) {
    const existing = await this.taxObligationRepo.findOne({ where: { id } })
    if (!existing) throw new NotFoundException(`Tax obligation ${id} not found`)

    await this.taxObligationRepo.remove(existing)
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
