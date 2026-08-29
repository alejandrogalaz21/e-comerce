import { HttpStatus } from '@nestjs/common'

/**
 * The single catalogue of machine-readable error codes. A client branches on
 * these, so a code must keep meaning the same thing across responses.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  RESOURCE_IN_USE: 'RESOURCE_IN_USE',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  PAYMENT_DECLINED: 'PAYMENT_DECLINED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

const BY_STATUS: Partial<Record<HttpStatus, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ERROR_CODES.VALIDATION_ERROR,
  [HttpStatus.UNAUTHORIZED]: ERROR_CODES.UNAUTHORIZED,
  [HttpStatus.PAYMENT_REQUIRED]: ERROR_CODES.PAYMENT_DECLINED,
  [HttpStatus.FORBIDDEN]: ERROR_CODES.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ERROR_CODES.NOT_FOUND,
  [HttpStatus.CONFLICT]: ERROR_CODES.CONFLICT,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ERROR_CODES.PAYLOAD_TOO_LARGE,
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: ERROR_CODES.UNSUPPORTED_MEDIA_TYPE
}

/** Used only when the exception did not carry a code of its own. */
export function codeForStatus(status: number): ErrorCode {
  return BY_STATUS[status as HttpStatus] ?? ERROR_CODES.INTERNAL_ERROR
}
