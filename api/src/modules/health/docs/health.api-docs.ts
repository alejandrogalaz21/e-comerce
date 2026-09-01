import { applyDecorators } from '@nestjs/common'
import { ApiExcludeEndpoint, ApiOperation, ApiResponse } from '@nestjs/swagger'

export const ApiRoot = () => applyDecorators(ApiExcludeEndpoint())

export const ApiHealthCheck = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Liveness and dependency probe',
      description:
        'Public so a container orchestrator can reach it. Reports application metadata, process resources and the Postgres round trip.'
    }),
    ApiResponse({
      status: 200,
      description: 'Application, resource and Postgres status'
    })
  )
