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

import { CreateCredentialDto } from './dto/create-credential.dto'
import { UpdateCredentialDto } from './dto/update-credential.dto'
import { Credential } from './entities/credential.entity'
import { Client } from '@/modules/clients/entities/client.entity'

@Injectable()
export class CredentialsService {
  private readonly logger = new Logger('CredentialsService')

  constructor(
    @InjectRepository(Credential)
    private readonly credentialRepo: Repository<Credential>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    private readonly paginationBuilder: PaginationResponseBuilder<any>
  ) {}

  async create(dto: CreateCredentialDto) {
    const client = await this.clientRepo.findOne({
      where: { id: dto.clientId }
    })
    if (!client) throw new NotFoundException(`Client ${dto.clientId} not found`)

    const existing = await this.credentialRepo.findOne({
      where: { client: { id: dto.clientId } },
      relations: ['client']
    })
    if (existing)
      throw new BadRequestException('Client already has credentials')

    try {
      const entity = this.credentialRepo.create({
        client,
        cerS3Path: dto.cerS3Path,
        keyS3Path: dto.keyS3Path,
        encryptedPassword: Buffer.from(dto.encryptedPassword, 'base64'),
        encryptionIv: Buffer.from(dto.encryptionIv, 'base64')
      })

      const saved = await this.credentialRepo.save(entity)
      return this.serialize(saved)
    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async findAll(pagination: PaginationDTO, clientId?: string) {
    const { page, limit, offset } = PaginationHelper.parse(pagination)

    const where = clientId ? { client: { id: clientId } } : {}

    const [items, total] = await this.credentialRepo.findAndCount({
      where,
      take: limit,
      skip: offset,
      relations: ['client']
    })

    const serialized = items.map(item => this.serialize(item))
    return this.paginationBuilder.build(serialized, total, page, limit)
  }

  async findOne(id: string) {
    const credential = await this.credentialRepo.findOne({
      where: { id },
      relations: ['client']
    })

    if (!credential) throw new NotFoundException(`Credential ${id} not found`)

    return this.serialize(credential)
  }

  async update(id: string, dto: UpdateCredentialDto) {
    const credential = await this.credentialRepo.findOne({
      where: { id },
      relations: ['client']
    })

    if (!credential) throw new NotFoundException(`Credential ${id} not found`)

    if (dto.clientId && dto.clientId !== credential.client.id) {
      const newClient = await this.clientRepo.findOne({
        where: { id: dto.clientId }
      })
      if (!newClient)
        throw new NotFoundException(`Client ${dto.clientId} not found`)
      credential.client = newClient
    }

    if (dto.cerS3Path) credential.cerS3Path = dto.cerS3Path
    if (dto.keyS3Path) credential.keyS3Path = dto.keyS3Path
    if (dto.encryptedPassword)
      credential.encryptedPassword = Buffer.from(
        dto.encryptedPassword,
        'base64'
      )
    if (dto.encryptionIv)
      credential.encryptionIv = Buffer.from(dto.encryptionIv, 'base64')

    try {
      const saved = await this.credentialRepo.save(credential)
      return this.serialize(saved)
    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async remove(id: string) {
    const existing = await this.credentialRepo.findOne({ where: { id } })
    if (!existing) throw new NotFoundException(`Credential ${id} not found`)

    await this.credentialRepo.remove(existing)
    return { id, deleted: true }
  }

  private serialize(entity: Credential) {
    return {
      id: entity.id,
      clientId: entity.client?.id ?? null,
      cerS3Path: entity.cerS3Path,
      keyS3Path: entity.keyS3Path,
      encryptedPassword: entity.encryptedPassword?.toString('base64') ?? null,
      encryptionIv: entity.encryptionIv?.toString('base64') ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
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
