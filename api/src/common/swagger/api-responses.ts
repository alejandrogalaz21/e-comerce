import { applyDecorators } from '@nestjs/common'
import { ApiQuery, ApiResponse } from '@nestjs/swagger'

export const ApiUnauthorizedResponse = () =>
  applyDecorators(
    ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  )

export const ApiValidationErrorResponse = () =>
  applyDecorators(
    ApiResponse({
      status: 400,
      description:
        'Validation error. VALIDATION_ERROR, with message as the list of failures'
    })
  )

export const ApiInvalidUuidResponse = () =>
  applyDecorators(ApiResponse({ status: 400, description: 'Invalid UUID' }))

export const ApiNotFoundResponse = (resource: string) =>
  applyDecorators(
    ApiResponse({
      status: 404,
      description: `${resource} not found: NOT_FOUND`
    })
  )

export const ApiPaginatedResponse = (item: string) =>
  applyDecorators(
    ApiResponse({
      status: 200,
      description: `Paginated list: { data: ${item}[], pagination: { total, per_page, current_page, last_page, from, to } }`
    })
  )

export const ApiPaginationQuery = (defaultLimit: number) =>
  applyDecorators(
    ApiQuery({ name: 'page', required: false, example: '1' }),
    ApiQuery({ name: 'limit', required: false, example: String(defaultLimit) })
  )
