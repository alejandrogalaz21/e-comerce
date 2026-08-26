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

import { CreateTaxActivityDto } from './dto/create-tax-activity.dto'
import { UpdateTaxActivityDto } from './dto/update-tax-activity.dto'
import { TaxActivity } from './entities/tax-activity.entity'
import { TaxProfile } from '@/modules/tax-profiles/entities/tax-profile.entity'

@Injectable()
export class TaxActivitiesService {
  private readonly logger = new Logger('TaxActivitiesService')

  constructor(
    @InjectRepository(TaxActivity)
    private readonly taxActivityRepo: Repository<TaxActivity>,
    @InjectRepository(TaxProfile)
    private readonly taxProfileRepo: Repository<TaxProfile>,
    private readonly paginationBuilder: PaginationResponseBuilder<TaxActivity>
  ) {}

  async create(dto: CreateTaxActivityDto) {
    const taxProfile = await this.taxProfileRepo.findOne({
      where: { id: dto.taxProfileId }
    })
    if (!taxProfile)
      throw new NotFoundException(`Tax profile ${dto.taxProfileId} not found`)

    try {
      const entity = this.taxActivityRepo.create({
        taxProfile,
        activity: dto.activity,
        percentage: dto.percentage
      })

      return await this.taxActivityRepo.save(entity)
    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async findAll(pagination: PaginationDTO, taxProfileId?: string) {
    const { page, limit, offset } = PaginationHelper.parse(pagination)

    const where = taxProfileId ? { taxProfile: { id: taxProfileId } } : {}

    const [items, total] = await this.taxActivityRepo.findAndCount({
      where,
      take: limit,
      skip: offset,
      relations: ['taxProfile']
    })

    return this.paginationBuilder.build(items, total, page, limit)
  }

  async findOne(id: string) {
    const activity = await this.taxActivityRepo.findOne({
      where: { id },
      relations: ['taxProfile']
    })

    if (!activity) throw new NotFoundException(`Tax activity ${id} not found`)

    return activity
  }

  async update(id: string, dto: UpdateTaxActivityDto) {
    const activity = await this.taxActivityRepo.findOne({ where: { id } })
    if (!activity) throw new NotFoundException(`Tax activity ${id} not found`)

    Object.assign(activity, dto)

    try {
      return await this.taxActivityRepo.save(activity)
    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async remove(id: string) {
    const existing = await this.taxActivityRepo.findOne({ where: { id } })
    if (!existing) throw new NotFoundException(`Tax activity ${id} not found`)

    await this.taxActivityRepo.remove(existing)
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
