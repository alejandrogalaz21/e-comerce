import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ConflictException, HttpStatus, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'

import { PaginationResponseBuilder } from '@/common/pagination/pagination-response.builder'
import { PAYMENT_PROVIDER } from '@/modules/payment/payment.interface'
import { ProductsService } from '@/modules/products/products.service'

import { Order } from './entities/order.entity'
import { OrderStatus } from './order-status.enum'
import { OrdersService } from './orders.service'

const SHIPPING = {
  name: 'Ada Lovelace',
  phone: '+14155552671',
  email: 'ada@example.com',
  address: '1 Test Street',
  city: 'Springfield',
  state: 'IL',
  zipCode: '62701',
  country: 'United States'
}
type Row = { id: string; sku: string; name: string; price: string; stock: number }

const SHOES = 'aaaaaaaa-0000-4000-8000-000000000001'
const SPEAKER = 'bbbbbbbb-0000-4000-8000-000000000002'

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: SHOES,
    sku: 'RS-001',
    name: 'Running Shoes',
    price: '89.99',
    stock: 10,
    ...overrides
  }
}

describe('OrdersService', () => {
  let service: OrdersService
  let catalog: Row[]
  let stockUpdates: { productId: string; quantity: number }[]
  let savedOrders: any[]

  const charge = jest.fn()
  const invalidateCache = jest.fn()

  const mockOrderRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    create: jest.fn((data: any) => ({ ...data })),
    save: jest.fn(async (order: any) => {
      savedOrders.push(order)
      return { id: 'saved-order-id', ...order }
    })
  }

  const mockManager = {
    create: jest.fn((_entity: any, data: any) => ({ ...data })),
    save: jest.fn(async (_entity: any, order: any) => ({
      id: 'order-id',
      ...order
    })),
    query: jest.fn(async (sql: string, params: any[]) => {
      if (sql.includes('FOR UPDATE')) {
        const ids: string[] = params[0]
        return catalog
          .filter(product => ids.includes(product.id))
          .sort((a, b) => a.id.localeCompare(b.id))
      }

      if (sql.includes('UPDATE "products"')) {
        stockUpdates.push({ productId: params[1], quantity: params[0] })
        return []
      }

      return []
    })
  }

  const queryBuilderReturning = (rows: any[], total: number) => {
    const builder: any = {
      leftJoinAndSelect: jest.fn(() => builder),
      orderBy: jest.fn(() => builder),
      skip: jest.fn(() => builder),
      take: jest.fn(() => builder),
      andWhere: jest.fn(() => builder),
      getManyAndCount: jest.fn(async () => [rows, total])
    }
    mockOrderRepository.createQueryBuilder.mockReturnValue(builder)
    return builder
  }

  const mockDataSource = {
    transaction: jest.fn(async (work: any) => work(mockManager))
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    catalog = [row()]
    stockUpdates = []
    savedOrders = []
    charge.mockResolvedValue({ status: 'approved', reference: 'fake_ch_1' })
    invalidateCache.mockResolvedValue(undefined)
    mockOrderRepository.findOne.mockResolvedValue(null)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        PaginationResponseBuilder,
        { provide: DataSource, useValue: mockDataSource },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
        { provide: PAYMENT_PROVIDER, useValue: { charge } },
        { provide: ProductsService, useValue: { invalidateCache } }
      ]
    }).compile()

    service = module.get<OrdersService>(OrdersService)
  })

  const buy = (items: { productId: string; quantity: number }[], key = 'key-1') =>
    service.create({ items, idempotencyKey: key, shippingAddress: SHIPPING })

  describe('placing an order', () => {
    it('charges the server-calculated total and discounts the stock', async () => {
      mockOrderRepository.findOne.mockResolvedValueOnce(null)
      mockOrderRepository.findOne.mockResolvedValue({
        id: 'order-id',
        status: OrderStatus.PAID
      })

      await buy([{ productId: SHOES, quantity: 2 }])

      expect(charge).toHaveBeenCalledWith(
        expect.objectContaining({ amountInCents: 17998 })
      )
      expect(stockUpdates).toEqual([{ productId: SHOES, quantity: 2 }])
    })

    it('freezes the unit price on each line', async () => {
      mockOrderRepository.findOne.mockResolvedValueOnce(null)
      mockOrderRepository.findOne.mockResolvedValue({ id: 'order-id' })

      await buy([{ productId: SHOES, quantity: 1 }])

      const [, created] = mockManager.create.mock.calls[0]
      expect(created.items[0]).toEqual(
        expect.objectContaining({
          sku: 'RS-001',
          name: 'Running Shoes',
          unitPriceSnapshot: '89.99',
          quantity: 1
        })
      )
    })

    it('ignores any amount sent by the client', async () => {
      mockOrderRepository.findOne.mockResolvedValueOnce(null)
      mockOrderRepository.findOne.mockResolvedValue({ id: 'order-id' })

      await service.create({
        items: [{ productId: SHOES, quantity: 1 }],
        idempotencyKey: 'key-1',
        shippingAddress: SHIPPING,
        // A client that tries to set the price must not be believed.
        ...({ total: '0.01', price: '0.01' } as any)
      })

      expect(charge).toHaveBeenCalledWith(
        expect.objectContaining({ amountInCents: 8999 })
      )
    })

    it('sums in integer cents, so a total that breaks in binary floating point is exact', async () => {
      // 0.1 + 0.2 !== 0.3 as doubles.
      catalog = [
        row({ id: SHOES, price: '0.10' }),
        row({ id: SPEAKER, sku: 'BS-021', price: '0.20' })
      ]
      mockOrderRepository.findOne.mockResolvedValueOnce(null)
      mockOrderRepository.findOne.mockResolvedValue({ id: 'order-id' })

      await buy([
        { productId: SHOES, quantity: 1 },
        { productId: SPEAKER, quantity: 1 }
      ])

      const [, created] = mockManager.create.mock.calls[0]
      expect(created.totalAmount).toBe('0.30')
      expect(charge).toHaveBeenCalledWith(
        expect.objectContaining({ amountInCents: 30 })
      )
    })

    it('counts the same product listed twice as one line against stock', async () => {
      catalog = [row({ stock: 3 })]

      await expect(
        buy([
          { productId: SHOES, quantity: 2 },
          { productId: SHOES, quantity: 2 }
        ])
      ).rejects.toThrow(ConflictException)
    })
  })

  /**
   * Buying is the fourth place that changes stock, and it was the only one not
   * telling the cached catalog about it: the shop kept serving the old number
   * until the entry expired, so the app looked like it never discounted stock.
   */
  describe('the delivery address', () => {
    const paidOrder = () => {
      mockOrderRepository.findOne.mockResolvedValueOnce(null)
      mockOrderRepository.findOne.mockResolvedValue({
        id: 'order-id',
        status: OrderStatus.PAID
      })
    }

    it('is stored in its own columns, alongside the order', async () => {
      paidOrder()

      await buy([{ productId: SHOES, quantity: 1 }])

      expect(mockManager.create).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({
          shipName: 'Ada Lovelace',
          shipPhone: '+14155552671',
          shipAddress: '1 Test Street',
          shipCity: 'Springfield',
          shipState: 'IL',
          shipZipCode: '62701',
          shipCountry: 'United States'
        })
      )
    })

    it('does not change what the order costs', async () => {
      paidOrder()

      await buy([{ productId: SHOES, quantity: 2 }])
      const withOneAddress = charge.mock.calls[0][0].amountInCents

      jest.clearAllMocks()
      charge.mockResolvedValue({ status: 'approved', reference: 'fake_ch_2' })
      paidOrder()

      await service.create({
        items: [{ productId: SHOES, quantity: 2 }],
        idempotencyKey: 'key-2',
        shippingAddress: { ...SHIPPING, city: 'Elsewhere', country: 'Canada' }
      })

      expect(charge.mock.calls[0][0].amountInCents).toBe(withOneAddress)
    })

    /**
     * The declined attempt is an audit record of what was tried, so it keeps the
     * address it was going to be delivered to.
     */
    it('is kept on a declined attempt too', async () => {
      charge.mockResolvedValue({ status: 'declined', reason: 'card declined by the issuer' })

      await expect(buy([{ productId: SHOES, quantity: 1 }])).rejects.toBeDefined()

      expect(mockOrderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.FAILED,
          shipName: 'Ada Lovelace',
          shipCity: 'Springfield'
        })
      )
    })
  })

  describe('the cached catalog', () => {
    it('is cleared once the order is committed', async () => {
      mockOrderRepository.findOne.mockResolvedValueOnce(null)
      mockOrderRepository.findOne.mockResolvedValue({
        id: 'order-id',
        status: OrderStatus.PAID
      })

      await buy([{ productId: SHOES, quantity: 2 }])

      expect(invalidateCache).toHaveBeenCalledTimes(1)
    })

    it('is left alone when the charge is declined', async () => {
      charge.mockResolvedValue({ status: 'declined', reason: 'card declined by the issuer' })

      await expect(buy([{ productId: SHOES, quantity: 2 }])).rejects.toBeDefined()

      // The transaction rolled back, so no stock changed and there is nothing
      // stale to clear.
      expect(invalidateCache).not.toHaveBeenCalled()
    })

    it('is left alone when a line falls short of stock', async () => {
      catalog = [row({ stock: 1 })]

      await expect(buy([{ productId: SHOES, quantity: 10 }])).rejects.toBeDefined()

      expect(invalidateCache).not.toHaveBeenCalled()
    })

    /**
     * The order is already committed by the time the cache is told. A dead
     * Redis must cost freshness, never the sale.
     */
    it('does not fail the order when clearing it blows up', async () => {
      mockOrderRepository.findOne.mockResolvedValueOnce(null)
      mockOrderRepository.findOne.mockResolvedValue({
        id: 'order-id',
        status: OrderStatus.PAID
      })
      invalidateCache.mockRejectedValueOnce(new Error('redis is down'))

      await expect(buy([{ productId: SHOES, quantity: 2 }])).resolves.toBeDefined()
    })
  })

  describe('stock conflicts', () => {
    it('rejects with 409 naming the product and what was left', async () => {
      catalog = [row({ stock: 3 })]

      await expect(buy([{ productId: SHOES, quantity: 10 }])).rejects.toMatchObject({
        response: {
          error: 'INSUFFICIENT_STOCK',
          sku: 'RS-001',
          requested: 10,
          available: 3
        }
      })
    })

    it('does not charge or touch stock when a line falls short', async () => {
      catalog = [
        row({ stock: 10 }),
        row({ id: SPEAKER, sku: 'BS-021', stock: 0 })
      ]

      await expect(
        buy([
          { productId: SHOES, quantity: 1 },
          { productId: SPEAKER, quantity: 1 }
        ])
      ).rejects.toThrow(ConflictException)

      expect(charge).not.toHaveBeenCalled()
      expect(stockUpdates).toEqual([])
    })

    it('rejects a product that is not in the catalog', async () => {
      await expect(
        buy([{ productId: SPEAKER, quantity: 1 }])
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('declined payment', () => {
    beforeEach(() => {
      charge.mockResolvedValue({ status: 'declined', reason: 'card declined by the issuer' })
    })

    it('responds 402 and leaves the stock untouched', async () => {
      await expect(buy([{ productId: SHOES, quantity: 2 }])).rejects.toMatchObject({
        status: HttpStatus.PAYMENT_REQUIRED,
        response: { error: 'PAYMENT_DECLINED' }
      })

      expect(stockUpdates).toEqual([])
    })

    it('records the failed attempt for audit, outside the rolled-back transaction', async () => {
      await expect(buy([{ productId: SHOES, quantity: 2 }])).rejects.toBeDefined()

      expect(savedOrders).toEqual([
        expect.objectContaining({
          status: OrderStatus.FAILED,
          totalAmount: '179.98',
          declineReason: 'card declined by the issuer'
        })
      ])
    })

    it('declines again when the same key is replayed, instead of charging twice', async () => {
      mockOrderRepository.findOne.mockResolvedValue({
        id: 'failed-order',
        status: OrderStatus.FAILED,
        declineReason: 'card declined by the issuer'
      })

      await expect(buy([{ productId: SHOES, quantity: 2 }])).rejects.toMatchObject({
        status: HttpStatus.PAYMENT_REQUIRED
      })

      expect(charge).not.toHaveBeenCalled()
    })
  })

  describe('idempotency', () => {
    it('returns the existing order without charging again', async () => {
      const existing = {
        id: 'order-id',
        status: OrderStatus.PAID,
        totalAmount: '179.98'
      }
      mockOrderRepository.findOne.mockResolvedValue(existing)

      const result = await buy([{ productId: SHOES, quantity: 2 }])

      expect(result).toEqual({ order: existing, replayed: true })
      expect(charge).not.toHaveBeenCalled()
      expect(stockUpdates).toEqual([])
    })

    it('falls back to the stored order when the unique constraint fires', async () => {
      const stored = { id: 'order-id', status: OrderStatus.PAID }
      mockOrderRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValue(stored)
      mockManager.save.mockRejectedValueOnce(
        Object.assign(new Error('duplicate key'), { code: '23505' })
      )

      const result = await buy([{ productId: SHOES, quantity: 2 }])

      expect(result).toEqual({ order: stored, replayed: true })
    })
  })

  describe('reading orders', () => {
    it('returns a not found error for an unknown order', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null)

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException)
    })

    /**
     * What each criterion selects is verified against a real database in
     * orders.filters.spec.ts, because these are Postgres expressions. Here only
     * the shape holds: newest first, the requested page, and no condition added
     * when nothing was asked for.
     */
    it('paginates newest first, with no filter when none is given', async () => {
      const builder = queryBuilderReturning([{ id: 'a' }], 1)

      const result = await service.findAll({ page: 1, limit: 20 })

      expect(builder.orderBy).toHaveBeenCalledWith('o.createdAt', 'DESC')
      expect(builder.skip).toHaveBeenCalledWith(0)
      expect(builder.take).toHaveBeenCalledWith(20)
      expect(builder.andWhere).not.toHaveBeenCalled()
      expect(result.pagination).toEqual(
        expect.objectContaining({ total: 1, current_page: 1, per_page: 20 })
      )
    })

    it('asks the database for the second page, not for everything', async () => {
      const builder = queryBuilderReturning([], 0)

      await service.findAll({ page: 3, limit: 10 })

      expect(builder.skip).toHaveBeenCalledWith(20)
      expect(builder.take).toHaveBeenCalledWith(10)
    })
  })
})
