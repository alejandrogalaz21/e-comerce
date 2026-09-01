import { applyDecorators } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse
} from '@nestjs/swagger'

import {
  ApiPaginationQuery,
  ApiUnauthorizedResponse
} from '@/common/swagger/api-responses'

import { Order } from '../entities/order.entity'
import { OrderStatus } from '../order-status.enum'

export const ApiPlaceOrder = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Place an order',
      description:
        'Public: a customer buys without an account. The total is calculated from the catalog; any amount sent by the client is ignored. Order, stock and charge resolve in a single transaction.'
    }),
    ApiResponse({ status: 201, description: 'Order placed', type: Order }),
    ApiResponse({
      status: 200,
      description:
        'The idempotency key was already used: the existing order is returned',
      type: Order
    }),
    ApiResponse({
      status: 400,
      description: 'Validation error: { statusCode, message: string[], error }'
    }),
    ApiResponse({
      status: 404,
      description: 'A referenced product does not exist'
    }),
    ApiResponse({
      status: 429,
      description: 'Too many orders placed from this address in the last minute'
    }),
    ApiResponse({
      status: 409,
      description:
        'Insufficient stock: { statusCode, error: INSUFFICIENT_STOCK, sku, requested, available }'
    }),
    ApiResponse({
      status: 402,
      description:
        'Payment declined: { statusCode, error: PAYMENT_DECLINED, message }. Nothing was saved and retrying is valid'
    })
  )

export const ApiListOrders = () =>
  applyDecorators(
    ApiBearerAuth('jwt'),
    ApiOperation({ summary: 'List placed orders' }),
    ApiPaginationQuery(20),
    ApiQuery({
      name: 'q',
      required: false,
      example: 'PRJ-001',
      description:
        'Order id prefix, any delivery detail (recipient name, phone, email, address, city, state, zip code, country), or a SKU or product name among its lines'
    }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: OrderStatus,
      example: OrderStatus.PAID
    }),
    ApiQuery({ name: 'dateFrom', required: false, example: '2026-08-01' }),
    ApiQuery({ name: 'dateTo', required: false, example: '2026-08-31' }),
    ApiResponse({ status: 200, description: 'Paginated orders' }),
    ApiResponse({
      status: 400,
      description: 'Invalid status or inverted date range'
    }),
    ApiUnauthorizedResponse()
  )

export const ApiGetOrder = () =>
  applyDecorators(
    ApiBearerAuth('jwt'),
    ApiOperation({ summary: 'Get one order with its lines' }),
    ApiResponse({ status: 200, description: 'Order found', type: Order }),
    ApiUnauthorizedResponse(),
    ApiResponse({ status: 404, description: 'Order not found' })
  )
