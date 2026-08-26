import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { User } from './entities/user.entity'
import { PaginationUserDTO } from './dto/paginatio-user.dto'
import { instanceToPlain } from 'class-transformer'
import * as bcrypt from 'bcryptjs'

import { Logger } from '@nestjs/common'
import { PaginationResponseBuilder } from 'src/common/pagination/pagination-response.builder'
import { PaginationHelper } from 'src/common/pagination/pagination.helper'

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly paginationBuilder: PaginationResponseBuilder<User>
  ) {}

  /**
   * Creates a new user in the system after validating that the email and phone number are not already registered.
   * Hashes the user's password before saving.
   * Returns the saved user as a plain object.
   * Throws a BadRequestException if the email or phone number is already registered.
   * Handles database exceptions.
   *
   * @param createUserDto - Data transfer object containing user details for creation.
   * @returns The newly created user as a plain object.
   * @throws {BadRequestException} If the email or phone number is already registered.
   */
  async create(createUserDto: CreateUserDto) {
    try {
      const existingEmail = await this.userRepository.findOne({
        where: { email: createUserDto.email }
      })
      if (existingEmail)
        throw new BadRequestException('Email already registered')

      const existingPhone = await this.userRepository.findOne({
        where: { phone: createUserDto.phone }
      })
      if (existingPhone)
        throw new BadRequestException('Phone number already registered')

      const hash = await bcrypt.hash(createUserDto.password, 10)
      const user = this.userRepository.create({
        ...createUserDto,
        password: hash
      })
      const savedUser = await this.userRepository.save(user)
      return instanceToPlain(savedUser)
    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async findAll(params?: PaginationUserDTO) {
    const {
      page,
      limit,
      role,
      status,
      phone,
      name,
      lastName,
      orderBy = 'id',
      orderDir = 'ASC'
    } = params || {}

    const {
      page: parsedPage,
      limit: parsedLimit,
      offset: parsedOffset
    } = PaginationHelper.parse({ page, limit })

    const query = this.userRepository.createQueryBuilder('user')

    const filters: Record<string, { sql: string; value: any }> = {
      role: { sql: 'user.role = :role', value: role },
      status: { sql: 'user.status = :status', value: status },
      phone: {
        sql: 'user.phone LIKE :phone',
        value: phone ? `%${phone}%` : undefined
      },
      name: {
        sql: 'LOWER(user.name) LIKE :name',
        value: name ? `%${name.toLowerCase()}%` : undefined
      },
      lastName: {
        sql: 'LOWER(user.lastName) LIKE :lastName',
        value: lastName ? `%${lastName.toLowerCase()}%` : undefined
      }
    }

    Object.entries(filters).forEach(([key, { sql, value }]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.andWhere(sql, { [key]: value })
      }
    })

    const allowedOrderFields = ['id', 'email', 'name', 'lastName']
    const orderField = allowedOrderFields.includes(orderBy) ? orderBy : 'id'
    const orderDirection = orderDir === 'DESC' ? 'DESC' : 'ASC'

    query.orderBy(`user.${orderField}`, orderDirection)

    const total = await query.getCount()

    if (parsedLimit) query.take(parsedLimit)
    if (parsedOffset) query.skip(parsedOffset)

    const users = await query.getMany()

    return this.paginationBuilder.build(users, total, parsedPage, parsedLimit)
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({ where: { id } })
    if (!user) throw new NotFoundException('User not found')
    return instanceToPlain(user)
  }

  async findByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } })
  }

  async findByPhone(phone: string) {
    return this.userRepository.findOne({ where: { phone } })
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.userRepository.update(id, updateUserDto)
    return this.findOne(id)
  }

  async remove(id: string) {
    await this.userRepository.delete(id)
    return { deleted: true }
  }

  /**
   * Handles database exceptions by checking the error code and throwing appropriate HTTP exceptions.
   * If the error code is '23505' (unique constraint violation), throws a BadRequestException with the error detail.
   * For all other errors, logs the error and throws an InternalServerErrorException with a generic message.
   *
   * @param error - The error object thrown by the database operation.
   * @throws {BadRequestException} If the error code is '23505'.
   * @throws {InternalServerErrorException} For all other errors.
   */
  private handleDBExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail)

    this.logger.error(error)
    throw new InternalServerErrorException(
      'Unexpected error, check server logs'
    )
  }
}
