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

import { CreateTaxAddressDto } from './dto/create-tax-address.dto'
import { UpdateTaxAddressDto } from './dto/update-tax-address.dto'
import { TaxAddress } from './entities/tax-address.entity'
import { TaxProfile } from '@/modules/tax-profiles/entities/tax-profile.entity'

@Injectable()
export class TaxAddressesService {
  private readonly logger = new Logger('TaxAddressesService')

  constructor(
    @InjectRepository(TaxAddress)
    private readonly addressRepo: Repository<TaxAddress>,
    @InjectRepository(TaxProfile)
    private readonly taxProfileRepo: Repository<TaxProfile>,
    private readonly paginationBuilder: PaginationResponseBuilder<TaxAddress>
  ) {}

  async create(dto: CreateTaxAddressDto) {
    const taxProfile = await this.taxProfileRepo.findOne({
      where: { id: dto.taxProfileId }
    })
    if (!taxProfile)
      throw new NotFoundException(`Tax profile ${dto.taxProfileId} not found`)

    try {
      const entity = this.addressRepo.create({ ...dto, taxProfile })
      return await this.addressRepo.save(entity)
    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async findAll(pagination: PaginationDTO, taxProfileId?: string) {
    const { page, limit, offset } = PaginationHelper.parse(pagination)

    const where = taxProfileId ? { taxProfile: { id: taxProfileId } } : {}

    const [items, total] = await this.addressRepo.findAndCount({
      where,
      take: limit,
      skip: offset,
      relations: ['taxProfile']
    })

    return this.paginationBuilder.build(items, total, page, limit)
  }

  async findOne(id: string) {
    const address = await this.addressRepo.findOne({
      where: { id },
      relations: ['taxProfile']
    })

    if (!address) throw new NotFoundException(`Tax address ${id} not found`)

    return address
  }

  async update(id: string, dto: UpdateTaxAddressDto) {
    const address = await this.addressRepo.findOne({ where: { id } })
    if (!address) throw new NotFoundException(`Tax address ${id} not found`)

    Object.assign(address, dto)

    try {
      return await this.addressRepo.save(address)
    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async remove(id: string) {
    const existing = await this.addressRepo.findOne({ where: { id } })
    if (!existing) throw new NotFoundException(`Tax address ${id} not found`)

    await this.addressRepo.remove(existing)
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
