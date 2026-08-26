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

import { CreateTaxRegimeDto } from './dto/create-tax-regime.dto'
import { UpdateTaxRegimeDto } from './dto/update-tax-regime.dto'
import { TaxRegime } from './entities/tax-regime.entity'
import { TaxProfile } from '@/modules/tax-profiles/entities/tax-profile.entity'

@Injectable()
export class TaxRegimesService {
  private readonly logger = new Logger('TaxRegimesService')

  constructor(
    @InjectRepository(TaxRegime)
    private readonly taxRegimeRepo: Repository<TaxRegime>,
    @InjectRepository(TaxProfile)
    private readonly taxProfileRepo: Repository<TaxProfile>,
    private readonly paginationBuilder: PaginationResponseBuilder<TaxRegime>
  ) {}

  async create(dto: CreateTaxRegimeDto) {
    const taxProfile = await this.taxProfileRepo.findOne({
      where: { id: dto.taxProfileId }
    })
    if (!taxProfile)
      throw new NotFoundException(`Tax profile ${dto.taxProfileId} not found`)

    this.validateDates(dto.startDate, dto.endDate)

    try {
      const entity = this.taxRegimeRepo.create({
        taxProfile,
        regimeName: dto.regimeName,
        startDate: dto.startDate,
        endDate: dto.endDate
      })

      return await this.taxRegimeRepo.save(entity)
    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async findAll(pagination: PaginationDTO, taxProfileId?: string) {
    const { page, limit, offset } = PaginationHelper.parse(pagination)

    const where = taxProfileId ? { taxProfile: { id: taxProfileId } } : {}

    const [items, total] = await this.taxRegimeRepo.findAndCount({
      where,
      take: limit,
      skip: offset,
      relations: ['taxProfile']
    })

    return this.paginationBuilder.build(items, total, page, limit)
  }

  async findOne(id: string) {
    const regime = await this.taxRegimeRepo.findOne({
      where: { id },
      relations: ['taxProfile']
    })

    if (!regime) throw new NotFoundException(`Tax regime ${id} not found`)

    return regime
  }

  async update(id: string, dto: UpdateTaxRegimeDto) {
    const regime = await this.taxRegimeRepo.findOne({ where: { id } })
    if (!regime) throw new NotFoundException(`Tax regime ${id} not found`)

    if (dto.startDate || dto.endDate) {
      this.validateDates(
        dto.startDate ?? regime.startDate,
        dto.endDate ?? regime.endDate
      )
    }

    Object.assign(regime, dto)

    try {
      return await this.taxRegimeRepo.save(regime)
    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async remove(id: string) {
    const existing = await this.taxRegimeRepo.findOne({ where: { id } })
    if (!existing) throw new NotFoundException(`Tax regime ${id} not found`)

    await this.taxRegimeRepo.remove(existing)
    return { id, deleted: true }
  }

  private validateDates(startDate?: string, endDate?: string | null) {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      throw new BadRequestException(
        'endDate must be greater than or equal to startDate'
      )
    }
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail)

    this.logger.error(error)
    throw new InternalServerErrorException(
      'Unexpected error, check server logs'
    )
  }
}
