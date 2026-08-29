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

/** The envelope every error response carries. Extra keys are error-specific detail. */
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

    // Anything that is not an HttpException was never meant to reach the client:
    // log it whole before replying with something deliberately uninformative.
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

  /**
   * A domain error already knows what it is — INSUFFICIENT_STOCK, PAYMENT_DECLINED —
   * so its own code wins. Nest's default fills `error` with the HTTP status in
   * prose, which is redundant with statusCode and useless to branch on, so that
   * form is replaced by a code derived from the status.
   */
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

  /**
   * Detail such as sku / requested / available stays at the top level: the
   * checkout already reads it there, and nesting it would break that for the
   * sake of tidiness.
   */
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
