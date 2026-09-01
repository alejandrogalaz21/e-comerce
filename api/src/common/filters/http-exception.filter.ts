import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common'
import { Request, Response } from 'express'

import { codeForStatus, ERROR_CODES } from './error-codes'

export interface ErrorResponseBody {
  statusCode: number
  error: string
  message: string | string[]
  path: string
  timestamp: string
  [detail: string]: unknown
}

const ENVELOPE_KEYS = ['statusCode', 'error', 'message', 'path', 'timestamp']

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    if (!(exception instanceof HttpException)) {
      this.logger.error(exception)
    }

    const payload = this.readPayload(exception)

    const body: ErrorResponseBody = {
      statusCode: status,
      error: this.resolveCode(payload, status),
      message: this.resolveMessage(payload, status),
      path: request.url,
      timestamp: new Date().toISOString(),
      ...this.extractDetail(payload)
    }

    response.status(status).json(body)
  }

  private readPayload(exception: unknown): Record<string, unknown> | string {
    if (!(exception instanceof HttpException)) return {}

    const response = exception.getResponse()

    return typeof response === 'string'
      ? response
      : (response as Record<string, unknown>)
  }

  private resolveCode(
    payload: Record<string, unknown> | string,
    status: number
  ): string {
    if (typeof payload !== 'string') {
      const own = payload.error

      if (typeof own === 'string' && /^[A-Z][A-Z0-9_]*$/.test(own)) return own
    }

    return codeForStatus(status)
  }

  private resolveMessage(
    payload: Record<string, unknown> | string,
    status: number
  ): string | string[] {
    if (typeof payload === 'string') return payload

    const message = payload.message

    if (typeof message === 'string' || Array.isArray(message)) return message

    return status === HttpStatus.INTERNAL_SERVER_ERROR
      ? 'Unexpected error, check server logs'
      : 'Request failed'
  }

  private extractDetail(
    payload: Record<string, unknown> | string
  ): Record<string, unknown> {
    if (typeof payload === 'string') return {}

    return Object.fromEntries(
      Object.entries(payload).filter(([key]) => !ENVELOPE_KEYS.includes(key))
    )
  }
}

export { ERROR_CODES }
