import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common'

import { ERROR_CODES } from './error-codes'
import { AllExceptionsFilter, ErrorResponseBody } from './http-exception.filter'

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter
  let body: ErrorResponseBody
  let statusCode: number

  const host = (url = '/api/v1/products'): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getResponse: () => ({
          status: (code: number) => {
            statusCode = code
            return { json: (payload: ErrorResponseBody) => (body = payload) }
          }
        }),
        getRequest: () => ({ url })
      })
    }) as unknown as ArgumentsHost

  beforeEach(() => {
    filter = new AllExceptionsFilter()
    body = undefined as never
    statusCode = 0
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => jest.restoreAllMocks())

  const envelope = ['statusCode', 'error', 'message', 'path', 'timestamp']

  describe('the envelope', () => {
    const cases: [string, HttpException][] = [
      ['404', new NotFoundException("Product with id 'x' not found")],
      ['400', new BadRequestException(['price must be a number'])],
      ['401', new UnauthorizedException()],
      ['409', new ConflictException('conflict')]
    ]

    it.each(cases)('gives %s the five required fields', (_label, exception) => {
      filter.catch(exception, host())

      expect(Object.keys(body)).toEqual(expect.arrayContaining(envelope))
    })

    it('gives an unexpected failure the same shape', () => {
      filter.catch(new Error('something exploded'), host())

      expect(statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR)
      expect(Object.keys(body)).toEqual(expect.arrayContaining(envelope))
    })

    it('reports the requested path and a valid timestamp', () => {
      filter.catch(new NotFoundException('nope'), host('/api/v1/orders/42'))

      expect(body.path).toBe('/api/v1/orders/42')
      expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false)
    })
  })

  describe('the error code', () => {
    it('derives a code from the status when the exception has none', () => {
      filter.catch(new NotFoundException('nope'), host())

      expect(body.error).toBe(ERROR_CODES.NOT_FOUND)
    })

    it('never leaves the HTTP status spelled out in prose', () => {
      filter.catch(new BadRequestException('bad'), host())

      expect(body.error).toBe(ERROR_CODES.VALIDATION_ERROR)
      expect(body.error).not.toBe('Bad Request')
    })

    it('keeps a domain code the exception already carried', () => {
      filter.catch(
        new ConflictException({
          error: ERROR_CODES.INSUFFICIENT_STOCK,
          message: 'not enough'
        }),
        host()
      )

      expect(body.error).toBe(ERROR_CODES.INSUFFICIENT_STOCK)
    })

    it('maps 429 to a rate-limit code, not to an internal error', () => {
      filter.catch(
        new HttpException(
          'ThrottlerException: Too Many Requests',
          HttpStatus.TOO_MANY_REQUESTS
        ),
        host()
      )

      expect(body.error).toBe(ERROR_CODES.TOO_MANY_REQUESTS)
    })

    it('maps 402 to a declined payment', () => {
      filter.catch(
        new HttpException({ message: 'declined' }, HttpStatus.PAYMENT_REQUIRED),
        host()
      )

      expect(body.error).toBe(ERROR_CODES.PAYMENT_DECLINED)
    })
  })

  describe('the detail', () => {
    it('keeps the stock conflict fields at the top level', () => {
      filter.catch(
        new ConflictException({
          error: ERROR_CODES.INSUFFICIENT_STOCK,
          message: 'Not enough stock for RS-001',
          sku: 'RS-001',
          requested: 10,
          available: 3
        }),
        host()
      )

      expect(body).toMatchObject({ sku: 'RS-001', requested: 10, available: 3 })
    })

    it('keeps several validation messages as a list', () => {
      filter.catch(
        new BadRequestException([
          'price must be a number',
          'stock must be an integer'
        ]),
        host()
      )

      expect(body.message).toEqual([
        'price must be a number',
        'stock must be an integer'
      ])
    })

    it('keeps a single message as a string', () => {
      filter.catch(new NotFoundException('not here'), host())

      expect(body.message).toBe('not here')
    })
  })

  describe('an unexpected failure', () => {
    it('does not leak internal detail to the client', () => {
      const leaky = Object.assign(new Error('boom'), {
        detail: 'Key (email)=(demo@demo.com) already exists',
        query: 'INSERT INTO "user" ...'
      })

      filter.catch(leaky, host())

      const serialized = JSON.stringify(body)
      expect(serialized).not.toContain('demo@demo.com')
      expect(serialized).not.toContain('INSERT INTO')
      expect(body.message).toBe('Unexpected error, check server logs')
    })

    it('logs it whole so it can still be diagnosed', () => {
      const logged = jest.spyOn(Logger.prototype, 'error')
      const failure = new Error('boom')

      filter.catch(failure, host())

      expect(logged).toHaveBeenCalledWith(failure)
    })

    it('does not log an ordinary HttpException as an internal failure', () => {
      const logged = jest.spyOn(Logger.prototype, 'error')

      filter.catch(new NotFoundException('nope'), host())

      expect(logged).not.toHaveBeenCalled()
    })
  })
})
