import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'

import {
  AuthenticatedUser,
  CurrentUser
} from '@/common/decorators/current-user.decorator'
import { Public } from '@/common/decorators/public.decorator'
import { THROTTLE } from '@/config'

import { CreateUserDto } from '../users/dto/create-user.dto'
import { UsersService } from '../users/users.service'
import { AuthService } from './auth.service'
import { ApiCurrentUser, ApiSignIn, ApiSignUp } from './docs/auth.api-docs'
import { SignInDto } from './dto/sign-in.dto'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  @Post('sign-up')
  @ApiSignUp()
  async signup(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto)
  }

  @Post('sign-in')
  @Public()
  @Throttle({ default: THROTTLE.signIn })
  @ApiSignIn()
  async signin(@Body() body: SignInDto) {
    const user = await this.authService.validateUser(body.email, body.password)
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }
    return this.authService.login(user)
  }

  @Get('me')
  @ApiCurrentUser()
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOne(user.userId)
  }
}
