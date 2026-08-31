import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { UsersService } from '../users/users.service'
import { CreateUserDto } from '../users/dto/create-user.dto'
import { SignInDto } from './dto/sign-in.dto'
import { Public } from '@/common/decorators/public.decorator'
import {
  AuthenticatedUser,
  CurrentUser
} from '@/common/decorators/current-user.decorator'

// Loose enough for a person and for the end-to-end suite, useless for a script:
// the global ceiling is 300/min because the status page polls, which for a
// credential endpoint is the same as having no limit at all.
const SIGN_IN_RATE_LIMIT = process.env.AUTH_RATE_LIMIT
  ? parseInt(process.env.AUTH_RATE_LIMIT, 10)
  : 30

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  /**
   * Deliberately not public. Buying needs no account, and the only thing an
   * account grants here is catalog administration, so an open sign-up would let
   * anyone hand themselves those rights.
   */
  @Post('sign-up')
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Create an account (requires an existing session)' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  async signup(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto)
  }

  @Post('sign-in')
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: SIGN_IN_RATE_LIMIT } })
  @ApiResponse({
    status: 200,
    description: 'Access token and public user data'
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async signin(@Body() body: SignInDto) {
    const user = await this.authService.validateUser(body.email, body.password)
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }
    return this.authService.login(user)
  }

  @Get('me')
  @ApiBearerAuth('jwt')
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOne(user.userId)
  }
}
