import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'

import { User } from '@/modules/users/entities/user.entity'
import { UsersService } from '@/modules/users/users.service'

import { AuthService } from './auth.service'

describe('AuthService', () => {
  const PASSWORD = 'a-real-password'
  let service: AuthService
  let usersService: { findByEmail: jest.Mock }

  beforeEach(async () => {
    const stored = Object.assign(new User(), {
      id: '0d6cd087-3f2e-4f30-b0aa-cf9c93b1c0d5',
      email: 'demo@demo.com',
      name: 'demo',
      lastName: 'user',
      phone: '+14155552671',
      password: await bcrypt.hash(PASSWORD, 4),
      refreshToken: 'a-token-nobody-should-see'
    })

    usersService = { findByEmail: jest.fn().mockResolvedValue(stored) }
    service = new AuthService(
      usersService as unknown as UsersService,
      new JwtService({ secret: 'a-signing-key-for-this-spec' })
    )
  })

  describe('validateUser', () => {
    it('returns the user without anything the entity excludes', async () => {
      const user = await service.validateUser('demo@demo.com', PASSWORD)

      expect(user).not.toHaveProperty('password')
      expect(user).not.toHaveProperty('refreshToken')
      expect(user.email).toBe('demo@demo.com')
    })

    it('returns null on a wrong password', async () => {
      expect(await service.validateUser('demo@demo.com', 'wrong')).toBeNull()
    })

    it('returns null when the account does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null)

      expect(await service.validateUser('ghost@demo.com', PASSWORD)).toBeNull()
    })
  })

  describe('login', () => {
    /**
     * The refresh token issued here used to be signed with the same secret and
     * payload as the access token, so the JWT strategy accepted it as one.
     */
    it('issues one access token and no refresh token', async () => {
      const user = await service.validateUser('demo@demo.com', PASSWORD)

      const session = await service.login(user)

      expect(session.accessToken).toEqual(expect.any(String))
      expect(session.refreshToken).toBeUndefined()
      expect(JSON.stringify(session)).not.toContain('a-token-nobody-should-see')
    })
  })
})
