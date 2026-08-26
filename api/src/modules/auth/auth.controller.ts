import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get,
  UseGuards,
  Req
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { UsersService } from '../users/users.service'
import { CreateUserDto } from '../users/dto/create-user.dto'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  @Post('sign-up')
  async signup(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto)
  }

  @Post('sign-in')
  async signin(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password)
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }
    return this.authService.login(user)
  }

  // GET endpoint to return the logged-in user's information
  @Get('me')
  // Protects the route using NestJS AuthGuard for JWT authentication
  @ApiBearerAuth('jwt')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req) {
    // req.user is populated by JwtStrategy.validate with userId and email
    const user = await this.usersService.findOne(req.user.userId)
    return user
  }
}
