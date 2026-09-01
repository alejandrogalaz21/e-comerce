import {
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { instanceToPlain } from 'class-transformer'
import * as bcrypt from 'bcryptjs'

import { translateDatabaseError } from '@/common/filters/database-error.translator'

import { CreateUserDto } from './dto/create-user.dto'
import { User } from './entities/user.entity'

const PASSWORD_SALT_ROUNDS = 10

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

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

      const password = await bcrypt.hash(
        createUserDto.password,
        PASSWORD_SALT_ROUNDS
      )
      const user = this.userRepository.create({ ...createUserDto, password })

      return instanceToPlain(await this.userRepository.save(user))
    } catch (error) {
      translateDatabaseError(error, { resource: 'User' })
    }
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({ where: { id } })
    if (!user) throw new NotFoundException('User not found')

    return instanceToPlain(user)
  }

  async findByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } })
  }
}
