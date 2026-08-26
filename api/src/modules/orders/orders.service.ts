// src/modules/orders/orders.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { OrdersRepository } from './orders.repository'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderDto } from './dto/update-order.dto'
import { Order } from './entities/order.entity'
import { v4 as uuid } from 'uuid'

/**
 * Service layer containing business logic for Orders.
 * Delegates persistence concerns to the `OrdersRepository`.
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger('OrdersService')

  constructor(private readonly ordersRepo: OrdersRepository) {}

  /**
   * Creates a new order item in DynamoDB.
   * Fills missing identifiers and timestamps when absent.
   */
  async create(dto: CreateOrderDto): Promise<Order> {
    const now = new Date().toISOString()
    const order: Order = {
      ...dto,
      orderId: dto.orderId || uuid(),
      createdAt: dto.createdAt || now,
      updatedAt: dto.updatedAt || now
    }
    await this.ordersRepo.create(order)
    return order
  }

  /**
   * Returns all orders. For large datasets, consider adding pagination.
   */
  async findAll(): Promise<Order[]> {
    return this.ordersRepo.findAll()
  }

  /**
   * Finds one order by its identifier.
   * @throws NotFoundException when the order does not exist.
   */
  async findOne(orderId: string): Promise<Order> {
    const order = await this.ordersRepo.findOne({ orderId })
    if (!order) throw new NotFoundException(`Order ${orderId} not found`)
    return order
  }

  /**
   * Applies partial changes to an existing order and returns the updated version.
   */
  async update(orderId: string, dto: UpdateOrderDto): Promise<Order> {
    const updated = await this.ordersRepo.update(orderId, dto)
    if (!updated) throw new NotFoundException(`Order ${orderId} not found`)
    return updated
  }

  /**
   * Deletes an order by id. Returns a simple confirmation object.
   */
  async remove(orderId: string) {
    // Ensure it exists before deleting for clearer error semantics
    const existing = await this.ordersRepo.findOne({ orderId })
    if (!existing) throw new NotFoundException(`Order ${orderId} not found`)
    return this.ordersRepo.delete({ orderId })
  }
}
