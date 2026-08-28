import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'

import { JwtAuthGuard } from './jwt-auth.guard'
import { Public } from '@/common/decorators/public.decorator'
import { JwtStrategy } from '@/modules/auth/jwt.strategy'

const JWT_SECRET = 'test-secret'

class ProtectedController {
  handler() {
    return 'protected'
  }
}

class PublicController {
  @Public()
  handler() {
    return 'public'
  }
}

@Public()
class FullyPublicController {
  handler() {
    return 'public'
  }
}

function contextFor(
  target: new () => { handler: () => string },
  authorization?: string
): ExecutionContext {
  const request = { headers: authorization ? { authorization } : {} } as Record<
    string,
    unknown
  >

  return {
    getHandler: () => target.prototype.handler,
    getClass: () => target,
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined
    })
  } as unknown as ExecutionContext
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard
  let jwtService: JwtService

  beforeAll(() => {
    new JwtStrategy({
      get: () => JWT_SECRET
    } as never)
  })

  beforeEach(() => {
    guard = new JwtAuthGuard(new Reflector())
    jwtService = new JwtService({ secret: JWT_SECRET })
  })

  it('rejects a request without a token', async () => {
    await expect(
      guard.canActivate(contextFor(ProtectedController))
    ).rejects.toThrow(UnauthorizedException)
  })

  it('rejects a token signed with another key', async () => {
    const token = new JwtService({ secret: 'another-secret' }).sign({
      sub: 'user-id',
      email: 'demo@demo.com'
    })

    await expect(
      guard.canActivate(contextFor(ProtectedController, `Bearer ${token}`))
    ).rejects.toThrow(UnauthorizedException)
  })

  it('rejects an expired token', async () => {
    const token = jwtService.sign(
      { sub: 'user-id', email: 'demo@demo.com' },
      { expiresIn: '-1s' }
    )

    await expect(
      guard.canActivate(contextFor(ProtectedController, `Bearer ${token}`))
    ).rejects.toThrow(UnauthorizedException)
  })

  it('accepts a valid token and exposes the user on the request', async () => {
    const token = jwtService.sign({ sub: 'user-id', email: 'demo@demo.com' })
    const context = contextFor(ProtectedController, `Bearer ${token}`)

    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(context.switchToHttp().getRequest().user).toEqual({
      userId: 'user-id',
      email: 'demo@demo.com'
    })
  })

  it('lets a handler marked @Public() through without a token', () => {
    expect(guard.canActivate(contextFor(PublicController))).toBe(true)
  })

  it('lets a controller marked @Public() through without a token', () => {
    expect(guard.canActivate(contextFor(FullyPublicController))).toBe(true)
  })
})
