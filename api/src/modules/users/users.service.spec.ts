import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import * as bcrypt from 'bcryptjs'

import { PaginationResponseBuilder } from '@/common/pagination/pagination-response.builder'

import { UsersService } from './users.service'
import { User } from './entities/user.entity'

function userWith(overrides: Partial<User> = {}): User {
  return Object.assign(new User(), {
    id: '0d6cd087-3f2e-4f30-b0aa-cf9c93b1c0d5',
    name: 'ada',
    lastName: 'lovelace',
    email: 'ada@example.com',
    phone: '+14155552671',
    password: '$2a$10$hashedhashedhashedhashedhashedhashedhashedhashedhas',
    ...overrides
  })
}

describe('UsersService', () => {
  let service: UsersService
  let repository: {
    createQueryBuilder: jest.Mock
    findOne: jest.Mock
    update: jest.Mock
  }
  let query: {
    andWhere: jest.Mock
    orderBy: jest.Mock
    take: jest.Mock
    skip: jest.Mock
    getCount: jest.Mock
    getMany: jest.Mock
  }

  beforeEach(async () => {
    query = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
      getMany: jest.fn().mockResolvedValue([userWith()])
    }
    repository = {
      createQueryBuilder: jest.fn().mockReturnValue(query),
      findOne: jest.fn().mockResolvedValue(userWith()),
      update: jest.fn().mockResolvedValue({ affected: 1 })
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        PaginationResponseBuilder,
        { provide: getRepositoryToken(User), useValue: repository }
      ]
    }).compile()

    service = moduleRef.get(UsersService)
  })

  describe('findAll', () => {
    it('never returns the password hash', async () => {
      const result = await service.findAll({})

      expect(result.data).toHaveLength(1)
      expect(result.data[0]).not.toHaveProperty('password')
      expect(result.data[0]).not.toHaveProperty('refreshToken')
      expect(result.data[0].email).toBe('ada@example.com')
    })

    it('leaks nothing through the serialized payload either', async () => {
      const result = await service.findAll({})

      expect(JSON.stringify(result)).not.toContain('$2a$10$')
    })
  })

  describe('update', () => {
    it('hashes a new password instead of storing it as typed', async () => {
      await service.update('0d6cd087-3f2e-4f30-b0aa-cf9c93b1c0d5', {
        password: 'a-brand-new-password'
      })

      const written = repository.update.mock.calls[0][1]

      expect(written.password).not.toBe('a-brand-new-password')
      expect(
        await bcrypt.compare('a-brand-new-password', written.password)
      ).toBe(true)
    })

    it('leaves the password alone when the update does not carry one', async () => {
      await service.update('0d6cd087-3f2e-4f30-b0aa-cf9c93b1c0d5', {
        name: 'grace'
      })

      expect(repository.update.mock.calls[0][1]).not.toHaveProperty('password')
    })
  })
})
