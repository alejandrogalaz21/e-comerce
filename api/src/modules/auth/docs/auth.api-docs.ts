import { applyDecorators } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'

import { ApiUnauthorizedResponse } from '@/common/swagger/api-responses'

export const ApiSignUp = () =>
  applyDecorators(
    ApiBearerAuth('jwt'),
    ApiOperation({
      summary: 'Create an account (requires an existing session)'
    }),
    ApiUnauthorizedResponse()
  )

export const ApiSignIn = () =>
  applyDecorators(
    ApiOperation({ summary: 'Exchange credentials for an access token' }),
    ApiResponse({
      status: 200,
      description: 'Access token and public user data'
    }),
    ApiResponse({ status: 401, description: 'Invalid credentials' }),
    ApiResponse({
      status: 429,
      description:
        'Too many sign-in attempts from this address in the last minute'
    })
  )

export const ApiCurrentUser = () =>
  applyDecorators(
    ApiBearerAuth('jwt'),
    ApiOperation({ summary: 'Read the signed-in account' }),
    ApiUnauthorizedResponse()
  )
