import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Check
} from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'

@Entity('products')
@Check('"price" >= 0')
@Check('"stock" >= 0')
export class Product {
  @ApiProperty({
    example: '0d6cd087-3f2e-4f30-b0aa-cf9c93b1c0d5',
    description: 'Product unique identifier (UUID)'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ApiProperty({
    example: 'RS-001',
    description: 'Business SKU, unique per product',
    maxLength: 50
  })
  @Column('varchar', { length: 50, unique: true })
  sku: string

  @ApiProperty({
    example: 'Running Shoes',
    description: 'Product display name',
    maxLength: 255
  })
  @Column('varchar', { length: 255 })
  name: string

  @ApiProperty({
    example: 'Lightweight running shoes for daily training',
    description: 'Product description',
    nullable: true,
    required: false
  })
  @Column('text', { nullable: true })
  description: string | null

  @ApiProperty({
    example: 'Footwear',
    description: 'Product category',
    default: 'Uncategorized',
    maxLength: 100
  })
  @Column('varchar', { length: 100, default: 'Uncategorized' })
  category: string

  @ApiProperty({
    example: '89.99',
    description:
      'Unit price, serialized as string to preserve decimal precision',
    type: String
  })
  @Column('numeric', { precision: 10, scale: 2 })
  price: string

  @ApiProperty({ example: 150, description: 'Units in stock', default: 0 })
  @Column('int', { default: 0 })
  stock: number

  @ApiProperty({
    example: '0.35',
    description:
      'Weight in kilograms, serialized as string to preserve decimal precision',
    type: String,
    nullable: true,
    required: false
  })
  @Column('numeric', {
    name: 'weight_kg',
    precision: 10,
    scale: 3,
    nullable: true
  })
  weightKg: string | null

  @ApiProperty({ example: '2026-08-26T10:00:00.000Z' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @ApiProperty({ example: '2026-08-26T10:00:00.000Z' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date
}
