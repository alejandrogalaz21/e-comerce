import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { Response } from 'express'

import { Public } from '@/common/decorators/public.decorator'
import { THROTTLE } from '@/config'

import { CreateOrderDto } from './dto/create-order.dto'
import { OrderFiltersDto } from './dto/order-filters.dto'
import { Order } from './entities/order.entity'
import { OrderStatus } from './order-status.enum'
import { OrdersService } from './orders.service'

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Public()
  // The only public route that writes and charges. The loose global ceiling
  // would let one address attempt hundreds of purchases a minute, each one
  // locking catalog rows and calling the payment provider.
  @Throttle({ default: THROTTLE.placeOrder })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Place an order',
    description:
      'Public: a customer buys without an account. The total is calculated from the catalog; any amount sent by the client is ignored. Order, stock and charge resolve in a single transaction.'
  })
  @ApiResponse({ status: 201, description: 'Order placed', type: Order })
  @ApiResponse({
    status: 200,
    description:
      'The idempotency key was already used: the existing order is returned',
    type: Order
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error: { statusCode, message: string[], error }'
  })
  @ApiResponse({
    status: 404,
    description: 'A referenced product does not exist'
  })
  @ApiResponse({
    status: 429,
    description: 'Too many orders placed from this address in the last minute'
  })
  @ApiResponse({
    status: 409,
    description:
      'Insufficient stock: { statusCode, error: INSUFFICIENT_STOCK, sku, requested, available }'
  })
  @ApiResponse({
    status: 402,
    description:
      'Payment declined: { statusCode, error: PAYMENT_DECLINED, message }. Nothing was saved and retrying is valid'
  })
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @Res({ passthrough: true }) response: Response
  ): Promise<Order> {
    const { order, replayed } = await this.ordersService.create(createOrderDto)

    response.status(replayed ? HttpStatus.OK : HttpStatus.CREATED)

    return order
  }

  @Get()
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'List placed orders' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiQuery({
    name: 'q',
    required: false,
    example: 'PRJ-001',
    description: 'Order id prefix, or a SKU or product name among its lines'
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: OrderStatus,
    example: OrderStatus.PAID
  })
  @ApiQuery({ name: 'dateFrom', required: false, example: '2026-08-01' })
  @ApiQuery({ name: 'dateTo', required: false, example: '2026-08-31' })
  @ApiResponse({ status: 200, description: 'Paginated orders' })
  @ApiResponse({ status: 400, description: 'Invalid status or inverted date range' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  findAll(@Query() filters: OrderFiltersDto) {
    return this.ordersService.findAll(filters)
  }

  @Get(':id')
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Get one order with its lines' })
  @ApiResponse({ status: 200, description: 'Order found', type: Order })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id)
  }
}
