import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, EntityManager, Repository } from 'typeorm'

import { PaginationResponseBuilder } from '@/common/pagination/pagination-response.builder'
import { Product } from '@/modules/products/entities/product.entity'
import { ProductsService } from '@/modules/products/products.service'
import {
  PAYMENT_PROVIDER,
  PaymentProvider
} from '@/modules/payment/payment.interface'

import { CreateOrderDto, ShippingAddressDto } from './dto/create-order.dto'
import { OrderFiltersDto } from './dto/order-filters.dto'
import { Order } from './entities/order.entity'
import { OrderItem } from './entities/order-item.entity'
import { OrderStatus } from './order-status.enum'

const UNIQUE_VIOLATION = '23505'

/**
 * Carries the snapshot out of the rolled-back transaction so the declined
 * attempt can still be recorded once the rollback has happened.
 */
class PaymentDeclinedError extends Error {
  constructor(
    readonly reason: string,
    readonly totalAmount: string,
    readonly items: OrderItem[]
  ) {
    super(reason)
  }
}

type LockedProduct = Pick<Product, 'id' | 'sku' | 'name' | 'price' | 'stock'>

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name)

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: PaymentProvider,
    private readonly paginationBuilder: PaginationResponseBuilder<Order>,
    private readonly productsService: ProductsService
  ) {}

  async create(dto: CreateOrderDto): Promise<{ order: Order; replayed: boolean }> {
    const existing = await this.findByIdempotencyKey(dto.idempotencyKey)
    if (existing) return this.replay(existing)

    const quantities = this.mergeQuantitiesByProduct(dto)

    try {
      const order = await this.dataSource.transaction(async manager => {
        const products = await this.lockProducts(manager, [...quantities.keys()])

        this.assertStockAvailable(products, quantities)

        const items = this.buildItems(products, quantities)
        const totalInCents = items.reduce(
          (sum, item) => sum + toCents(item.unitPriceSnapshot) * item.quantity,
          0
        )

        const order = manager.create(Order, {
          status: OrderStatus.PENDING,
          totalAmount: fromCents(totalInCents),
          idempotencyKey: dto.idempotencyKey,
          ...toShippingColumns(dto.shippingAddress),
          items
        })
        const saved = await manager.save(Order, order)

        const charge = await this.paymentProvider.charge({
          amountInCents: totalInCents,
          idempotencyKey: dto.idempotencyKey
        })

        if (charge.status === 'declined') {
          throw new PaymentDeclinedError(
            charge.reason,
            fromCents(totalInCents),
            items
          )
        }

        await this.discountStock(manager, quantities)

        saved.status = OrderStatus.PAID
        saved.paymentReference = charge.reference
        await manager.save(Order, saved)

        return saved
      })

      // After the commit, never inside it: a rolled-back attempt changed no
      // stock, so clearing the catalog for it would be work for nothing. A
      // replay does not reach here either, for the same reason.
      await this.clearCatalogCache()

      return { order: await this.findOne(order.id), replayed: false }
    } catch (error) {
      if (error instanceof PaymentDeclinedError) {
        await this.recordDeclinedAttempt(
          dto.idempotencyKey,
          error,
          dto.shippingAddress
        )
        throw declined(error.reason)
      }

      // The insert races with a concurrent replay of the same key: the unique
      // constraint is what decides, not a prior read.
      if (isUniqueViolation(error)) {
        const replayed = await this.findByIdempotencyKey(dto.idempotencyKey)
        if (replayed) return this.replay(replayed)
      }
      throw error
    }
  }

  /**
   * The sale is already committed when this runs, so a cache that cannot be
   * reached costs freshness and nothing else. Letting it throw here would undo
   * a purchase that succeeded because Redis is down.
   */
  private async clearCatalogCache(): Promise<void> {
    try {
      await this.productsService.invalidateCache()
    } catch (error) {
      this.logger.warn(
        `stock changed but the catalog cache was not cleared: ${String(error)}`
      )
    }
  }

  /**
   * One key, one outcome. Replaying the key of a declined attempt declines again
   * instead of charging a second time; retrying means a new attempt with a new key.
   */
  private replay(order: Order): { order: Order; replayed: boolean } {
    if (order.status === OrderStatus.FAILED) {
      throw declined(order.declineReason ?? 'the charge was declined')
    }

    return { order, replayed: true }
  }

  /**
   * Written in its own transaction: the one holding the order was rolled back, so
   * the audit record of the declined attempt would have gone with it. Stock is
   * deliberately untouched.
   */
  private async recordDeclinedAttempt(
    idempotencyKey: string,
    failure: PaymentDeclinedError,
    shippingAddress: ShippingAddressDto
  ): Promise<void> {
    const order = this.orderRepository.create({
      status: OrderStatus.FAILED,
      totalAmount: failure.totalAmount,
      idempotencyKey,
      declineReason: failure.reason,
      ...toShippingColumns(shippingAddress),
      items: failure.items
    })

    try {
      await this.orderRepository.save(order)
    } catch (error) {
      // A concurrent attempt already recorded this key; the audit trail exists.
      if (!isUniqueViolation(error)) throw error
    }
  }

  async findAll(filters: OrderFiltersDto) {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20

    assertDateRange(filters)

    const query = this.orderRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'item')
      .orderBy('o.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    if (filters.q) {
      const term = filters.q.trim()

      // An order has no customer, so what identifies it is its id and what it
      // contains. EXISTS rather than a join: joining the lines would multiply
      // the order by them and break the count that drives pagination.
      query.andWhere(
        `(o.id::text ILIKE :prefix
          OR EXISTS (
            SELECT 1 FROM order_items i
            WHERE i.order_id = o.id
              AND (i.sku ILIKE :contains OR i.name ILIKE :contains)
          ))`,
        { prefix: `${term}%`, contains: `%${term}%` }
      )
    }

    if (filters.status) {
      query.andWhere('o.status = :status', { status: filters.status })
    }

    if (filters.dateFrom) {
      query.andWhere('o.createdAt >= :dateFrom', { dateFrom: filters.dateFrom })
    }

    if (filters.dateTo) {
      // Half-open on the next day: `<= dateTo` would cut the range at midnight
      // and drop every order placed during that day.
      query.andWhere(`o.createdAt < (CAST(:dateTo AS date) + INTERVAL '1 day')`, {
        dateTo: filters.dateTo
      })
    }

    const [data, total] = await query.getManyAndCount()

    return this.paginationBuilder.build(data, total, page, limit)
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { items: true }
    })

    if (!order) throw new NotFoundException(`Order ${id} not found`)

    return order
  }

  private async findByIdempotencyKey(key: string): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { idempotencyKey: key },
      relations: { items: true }
    })
  }

  /**
   * The same product listed twice in one request is one lock and one stock check,
   * otherwise each line would validate against the full stock on its own.
   */
  private mergeQuantitiesByProduct(dto: CreateOrderDto): Map<string, number> {
    const quantities = new Map<string, number>()

    for (const item of dto.items) {
      quantities.set(
        item.productId,
        (quantities.get(item.productId) ?? 0) + item.quantity
      )
    }

    return quantities
  }

  /**
   * Ordering by id is what keeps two concurrent multi-line orders from
   * deadlocking: without it, locking the same rows in opposite sequence
   * leaves each transaction holding what the other needs.
   */
  private async lockProducts(
    manager: EntityManager,
    productIds: string[]
  ): Promise<Map<string, LockedProduct>> {
    const rows: LockedProduct[] = await manager.query(
      `SELECT "id", "sku", "name", "price", "stock"
         FROM "products"
        WHERE "id" = ANY($1::uuid[])
        ORDER BY "id"
          FOR UPDATE`,
      [productIds]
    )

    const found = new Map(rows.map(row => [row.id, row]))

    for (const id of productIds) {
      if (!found.has(id)) throw new NotFoundException(`Product ${id} not found`)
    }

    return found
  }

  private assertStockAvailable(
    products: Map<string, LockedProduct>,
    quantities: Map<string, number>
  ): void {
    for (const [productId, quantity] of quantities) {
      const product = products.get(productId)!

      if (product.stock < quantity) {
        throw new ConflictException({
          statusCode: 409,
          error: 'INSUFFICIENT_STOCK',
          message: `Not enough stock for ${product.sku}: ${quantity} requested, ${product.stock} left`,
          productId,
          sku: product.sku,
          requested: quantity,
          available: product.stock
        })
      }
    }
  }

  private buildItems(
    products: Map<string, LockedProduct>,
    quantities: Map<string, number>
  ): OrderItem[] {
    return [...quantities.entries()].map(([productId, quantity]) => {
      const product = products.get(productId)!

      return {
        productId,
        sku: product.sku,
        name: product.name,
        quantity,
        unitPriceSnapshot: product.price
      } as OrderItem
    })
  }

  private async discountStock(
    manager: EntityManager,
    quantities: Map<string, number>
  ): Promise<void> {
    for (const [productId, quantity] of quantities) {
      await manager.query(
        `UPDATE "products" SET "stock" = "stock" - $1 WHERE "id" = $2`,
        [quantity, productId]
      )
    }
  }
}

/**
 * Postgres numeric arrives as a string. Converting it to a number to add it up
 * is exactly where binary floating point corrupts a total, so amounts are summed
 * as integer cents and formatted once at the end.
 */
function toCents(amount: string): number {
  const [whole, fraction = ''] = amount.split('.')
  const cents = `${fraction}00`.slice(0, 2)

  return Number(whole) * 100 + Number(cents)
}

function fromCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

/**
 * The wire groups the address in one object; the table keeps it in columns so
 * Postgres can enforce lengths. `addressType` and `primary` are not carried
 * over: they belong to an address book this system does not have.
 */
function toShippingColumns(address: ShippingAddressDto) {
  return {
    shipName: address.name,
    shipPhone: address.phone,
    shipAddress: address.address,
    shipCity: address.city,
    shipState: address.state,
    shipZipCode: address.zipCode,
    shipCountry: address.country
  }
}

/**
 * An inverted range is a client mistake, and answering it with an empty list
 * would be indistinguishable from "no orders in that range".
 */
function assertDateRange(filters: OrderFiltersDto): void {
  const { dateFrom, dateTo } = filters

  if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
    throw new BadRequestException(
      `dateFrom (${dateFrom}) must not be later than dateTo (${dateTo})`
    )
  }
}

function declined(reason: string): HttpException {
  return new HttpException(
    {
      statusCode: HttpStatus.PAYMENT_REQUIRED,
      error: 'PAYMENT_DECLINED',
      message: `Payment was declined: ${reason}`
    },
    HttpStatus.PAYMENT_REQUIRED
  )
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === UNIQUE_VIOLATION
  )
}
