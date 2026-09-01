import {
  ConflictException,
  InternalServerErrorException,
  Logger
} from '@nestjs/common'

import { ERROR_CODES } from './error-codes'

const UNIQUE_VIOLATION = '23505'
const FOREIGN_KEY_VIOLATION = '23503'

const logger = new Logger('DatabaseError')

export interface DatabaseErrorContext {
  resource: string
  field?: string
  identifier?: string
}

export function translateDatabaseError(
  error: unknown,
  context: DatabaseErrorContext
): never {
  const code = (error as { code?: string })?.code

  if (code === UNIQUE_VIOLATION) {
    throw new ConflictException({
      error: ERROR_CODES.DUPLICATE_RESOURCE,
      message: buildDuplicateMessage(context)
    })
  }

  if (code === FOREIGN_KEY_VIOLATION) {
    throw new ConflictException({
      error: ERROR_CODES.RESOURCE_IN_USE,
      message: `${context.resource} is referenced by other records and cannot be removed`
    })
  }

  logger.error(error)
  throw new InternalServerErrorException({
    error: ERROR_CODES.INTERNAL_ERROR,
    message: 'Unexpected error, check server logs'
  })
}

function buildDuplicateMessage(context: DatabaseErrorContext): string {
  if (!context.identifier) return `${context.resource} already exists`

  const field = context.field ? ` with ${context.field}` : ''

  return `${context.resource}${field} '${context.identifier}' already exists`
}
