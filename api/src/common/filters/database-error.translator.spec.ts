import { ConflictException, HttpException, Logger } from '@nestjs/common'

import { translateDatabaseError } from './database-error.translator'
import { ERROR_CODES } from './error-codes'

const pgError = (code: string, extra: Record<string, unknown> = {}) =>
  Object.assign(new Error('db failure'), { code, ...extra })

function captured(
  error: unknown,
  context: Parameters<typeof translateDatabaseError>[1]
) {
  try {
    translateDatabaseError(error, context)
  } catch (thrown) {
    return thrown as HttpException
  }
  throw new Error('translateDatabaseError should always throw')
}

describe('translateDatabaseError', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => jest.restoreAllMocks())

  describe('unique violation', () => {
    it('is a conflict, the same one for every module', () => {
      const fromProducts = captured(pgError('23505'), {
        resource: 'Product',
        field: 'sku',
        identifier: 'RS-001'
      })
      const fromUsers = captured(pgError('23505'), { resource: 'User' })

      expect(fromProducts).toBeInstanceOf(ConflictException)
      expect(fromUsers).toBeInstanceOf(ConflictException)
      expect(fromProducts.getStatus()).toBe(fromUsers.getStatus())
    })

    it('carries the duplicate code', () => {
      const error = captured(pgError('23505'), { resource: 'User' })

      expect(error.getResponse()).toMatchObject({
        error: ERROR_CODES.DUPLICATE_RESOURCE
      })
    })

    it('names the field that collided when it is given', () => {
      const error = captured(pgError('23505'), {
        resource: 'Product',
        field: 'sku',
        identifier: 'RS-001'
      })

      expect(error.getResponse()).toMatchObject({
        message: "Product with sku 'RS-001' already exists"
      })
    })
  })

  describe('foreign key violation', () => {
    it('is a conflict, not an internal failure', () => {
      const error = captured(pgError('23503'), { resource: 'Product' })

      expect(error.getStatus()).toBe(409)
      expect(error.getResponse()).toMatchObject({
        error: ERROR_CODES.RESOURCE_IN_USE
      })
    })

    it('explains that the resource is still referenced', () => {
      const error = captured(pgError('23503'), { resource: 'Product' })

      expect(
        String((error.getResponse() as { message: string }).message)
      ).toContain('referenced by other records')
    })
  })

  describe('anything else', () => {
    it('is a 500 with a generic message', () => {
      const error = captured(pgError('42P01'), { resource: 'Product' })

      expect(error.getStatus()).toBe(500)
      expect(error.getResponse()).toMatchObject({
        error: ERROR_CODES.INTERNAL_ERROR,
        message: 'Unexpected error, check server logs'
      })
    })

    it('never returns the Postgres detail to the client', () => {
      const error = captured(
        pgError('42P01', {
          detail: 'Key (email)=(demo@demo.com) already exists'
        }),
        { resource: 'User' }
      )

      expect(JSON.stringify(error.getResponse())).not.toContain('demo@demo.com')
    })

    it('logs the real error so it can be diagnosed', () => {
      const logged = jest.spyOn(Logger.prototype, 'error')
      const failure = pgError('42P01')

      captured(failure, { resource: 'User' })

      expect(logged).toHaveBeenCalledWith(failure)
    })
  })
})
