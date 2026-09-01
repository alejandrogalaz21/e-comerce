import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany
} from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'

import { OrderStatus } from '../order-status.enum'
import { PaymentMethod } from '../payment-method.enum'
import { OrderItem } from './order-item.entity'

@Entity('orders')
export class Order {
  @ApiProperty({
    example: '9f1c1f7e-2b5a-4a1d-9c2e-8f3b6d0a1e44',
    description: 'Order unique identifier (UUID)'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.PAID,
    description: 'PAID once the charge is approved; FAILED if it was declined'
  })
  @Column('varchar', { length: 20 })
  status: OrderStatus

  @ApiProperty({
    example: '129.97',
    description:
      'Server-calculated total, serialized as string to preserve decimal precision',
    type: String
  })
  @Column('numeric', { name: 'total_amount', precision: 12, scale: 2 })
  totalAmount: string

  @ApiProperty({
    example: '3f7b1c92-5d2e-4c8a-b1f0-6a9e2d4c8b31',
    description:
      'Client-generated key. Replaying it returns the existing order instead of charging again'
  })
  @Column('varchar', { name: 'idempotency_key', length: 100, unique: true })
  idempotencyKey: string

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.CARD,
    description: 'How the buyer chose to pay. Null on orders placed before it was recorded',
    nullable: true,
    required: false
  })
  @Column('varchar', { name: 'payment_method', length: 20, nullable: true })
  paymentMethod: PaymentMethod | null

  @ApiProperty({
    example: 'fake_ch_8f3b6d0a1e44',
    description: 'Reference returned by the payment provider on approval',
    nullable: true,
    required: false
  })
  @Column('varchar', { name: 'payment_reference', length: 100, nullable: true })
  paymentReference: string | null

  @ApiProperty({
    example: 'card declined by the issuer',
    description: 'Why the charge was declined. Only set on FAILED orders',
    nullable: true,
    required: false
  })
  @Column('varchar', { name: 'decline_reason', length: 255, nullable: true })
  declineReason: string | null

  // Where the order goes. Nullable because orders placed before deliveries were
  // recorded have none; the DTO is what requires it from now on.
  @ApiProperty({ example: 'Ada Lovelace', nullable: true, required: false })
  @Column('varchar', { name: 'ship_name', length: 255, nullable: true })
  shipName: string | null

  @ApiProperty({ example: '+14155552671', nullable: true, required: false })
  @Column('varchar', { name: 'ship_phone', length: 30, nullable: true })
  shipPhone: string | null

  @ApiProperty({ example: 'ada@example.com', nullable: true, required: false })
  @Column('varchar', { name: 'ship_email', length: 255, nullable: true })
  shipEmail: string | null

  @ApiProperty({ example: '1 Test Street', nullable: true, required: false })
  @Column('varchar', { name: 'ship_address', length: 255, nullable: true })
  shipAddress: string | null

  @ApiProperty({ example: 'Springfield', nullable: true, required: false })
  @Column('varchar', { name: 'ship_city', length: 100, nullable: true })
  shipCity: string | null

  @ApiProperty({ example: 'IL', nullable: true, required: false })
  @Column('varchar', { name: 'ship_state', length: 100, nullable: true })
  shipState: string | null

  @ApiProperty({ example: '62701', nullable: true, required: false })
  @Column('varchar', { name: 'ship_zip_code', length: 20, nullable: true })
  shipZipCode: string | null

  @ApiProperty({ example: 'United States', nullable: true, required: false })
  @Column('varchar', { name: 'ship_country', length: 100, nullable: true })
  shipCountry: string | null

  @ApiProperty({ example: '2026-08-29T10:00:00.000Z' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @ApiProperty({ type: () => [OrderItem] })
  @OneToMany(() => OrderItem, item => item.order, { cascade: ['insert'] })
  items: OrderItem[]
}
