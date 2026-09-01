import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import * as bcrypt from 'bcryptjs'

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
    findOne: jest.Mock
    create: jest.Mock
    save: jest.Mock
  }

  beforeEach(async () => {
    repository = {
      findOne: jest.fn().mockResolvedValue(userWith()),
      create: jest
        .fn()
        .mockImplementation(data => Object.assign(new User(), data)),
      save: jest.fn().mockImplementation(async user => user)
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository }
      ]
    }).compile()

    service = moduleRef.get(UsersService)
  })

  describe('findOne', () => {
    it('never returns the password hash', async () => {
      const user = await service.findOne('0d6cd087-3f2e-4f30-b0aa-cf9c93b1c0d5')

      expect(user).not.toHaveProperty('password')
      expect(user).not.toHaveProperty('refreshToken')
      expect(user.email).toBe('ada@example.com')
    })

    it('leaks nothing through the serialized payload either', async () => {
      const user = await service.findOne('0d6cd087-3f2e-4f30-b0aa-cf9c93b1c0d5')

      expect(JSON.stringify(user)).not.toContain('$2a$10$')
    })
  })

  describe('create', () => {
    it('hashes the password instead of storing it as typed', async () => {
      repository.findOne.mockResolvedValue(null)

      await service.create({
        name: 'grace',
        lastName: 'hopper',
        email: 'grace@example.com',
        phone: '+14155552672',
        password: 'a-brand-new-password'
      } as never)

      const written = repository.save.mock.calls[0][0]

      expect(written.password).not.toBe('a-brand-new-password')
      expect(
        await bcrypt.compare('a-brand-new-password', written.password)
      ).toBe(true)
    })

    it('does not return the hash it just wrote', async () => {
      repository.findOne.mockResolvedValue(null)

      const created = await service.create({
        name: 'grace',
        lastName: 'hopper',
        email: 'grace@example.com',
        phone: '+14155552672',
        password: 'a-brand-new-password'
      } as never)

      expect(created).not.toHaveProperty('password')
    })
  })
})
