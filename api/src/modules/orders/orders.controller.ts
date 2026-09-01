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
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { Response } from 'express'

import { Public } from '@/common/decorators/public.decorator'
import { THROTTLE } from '@/config'

import {
  ApiGetOrder,
  ApiListOrders,
  ApiPlaceOrder
} from './docs/orders.api-docs'
import { CreateOrderDto } from './dto/create-order.dto'
import { OrderFiltersDto } from './dto/order-filters.dto'
import { Order } from './entities/order.entity'
import { OrdersService } from './orders.service'

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Public()
  @Throttle({ default: THROTTLE.placeOrder })
  @HttpCode(HttpStatus.CREATED)
  @ApiPlaceOrder()
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @Res({ passthrough: true }) response: Response
  ): Promise<Order> {
    const { order, replayed } = await this.ordersService.create(createOrderDto)

    response.status(replayed ? HttpStatus.OK : HttpStatus.CREATED)

    return order
  }

  @Get()
  @ApiListOrders()
  findAll(@Query() filters: OrderFiltersDto) {
    return this.ordersService.findAll(filters)
  }

  @Get(':id')
  @ApiGetOrder()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id)
  }
}
