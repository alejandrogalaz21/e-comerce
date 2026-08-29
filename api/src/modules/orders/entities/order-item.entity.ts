import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Check
} from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'

import { Product } from '@/modules/products/entities/product.entity'
import { Order } from './order.entity'

@Entity('order_items')
@Check('"quantity" > 0')
@Check('"unit_price_snapshot" >= 0')
export class OrderItem {
  @ApiProperty({ example: '4c2a8e10-9b3d-4f21-8e5c-1a7d3b6f0c92' })
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('uuid', { name: 'order_id' })
  orderId: string

  @ManyToOne(() => Order, order => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order

  @ApiProperty({ example: '0d6cd087-3f2e-4f30-b0aa-cf9c93b1c0d5' })
  @Column('uuid', { name: 'product_id' })
  productId: string

  // RESTRICT: an order is a historical record. Deleting a product that was
  // sold must fail rather than erase the line that proves the sale.
  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product

  @ApiProperty({ example: 'RS-001', description: 'SKU as sold' })
  @Column('varchar', { length: 50 })
  sku: string

  @ApiProperty({ example: 'Running Shoes', description: 'Name as sold' })
  @Column('varchar', { length: 255 })
  name: string

  @ApiProperty({ example: 2, description: 'Units purchased' })
  @Column('int')
  quantity: number

  @ApiProperty({
    example: '89.99',
    description:
      'Unit price frozen at purchase time. A later price change never mutates this',
    type: String
  })
  @Column('numeric', {
    name: 'unit_price_snapshot',
    precision: 12,
    scale: 2
  })
  unitPriceSnapshot: string
}
