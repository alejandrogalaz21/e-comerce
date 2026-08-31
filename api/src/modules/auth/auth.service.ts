import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '../users/users.service'
import { instanceToPlain } from 'class-transformer'
import * as bcrypt from 'bcryptjs'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email)
    if (user && (await bcrypt.compare(pass, user.password))) {
      // Through instanceToPlain rather than dropping `password` by hand: the
      // entity marks what must not leave, and picking fields off manually is
      // what let the unused refreshToken column travel in the sign-in response.
      return instanceToPlain(user)
    }
    return null
  }

  /**
   * One token, and no refresh token. The refresh token issued here was signed
   * with the same secret and the same payload as the access token, so the JWT
   * strategy accepted it as one: it was an access token with a seven-day life
   * and nothing to rotate or revoke it. A real one needs its own claim, its own
   * endpoint and rotation; until then, not issuing it is the safer half.
   */
  async login(user: any) {
    const payload = { email: user.email, sub: user.id }
    const accessToken = this.jwtService.sign(payload)
    return {
      ...user,
      accessToken
    }
  }
}
