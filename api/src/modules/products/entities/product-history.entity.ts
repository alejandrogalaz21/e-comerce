import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'

export type ProductHistoryOperation = 'INSERT' | 'UPDATE' | 'DELETE'

@Entity('product_history')
export class ProductHistory {
  @ApiProperty({ example: '4c2a8e10-9b3d-4f21-8e5c-1a7d3b6f0c92' })
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ApiProperty({
    example: '0d6cd087-3f2e-4f30-b0aa-cf9c93b1c0d5',
    description:
      'The product this entry describes. Deliberately not a foreign key: an audit constrained by what it audits dies with it'
  })
  @Column('uuid', { name: 'product_id' })
  productId: string

  @ApiProperty({
    example: 'RS-001',
    description:
      'SKU as it was at the time, so a deleted product is still findable'
  })
  @Column('varchar', { length: 50 })
  sku: string

  @ApiProperty({ enum: ['INSERT', 'UPDATE', 'DELETE'], example: 'UPDATE' })
  @Column('varchar', { length: 10 })
  operation: ProductHistoryOperation

  @ApiProperty({ example: '2026-09-01T10:00:00.000Z' })
  @Column('timestamptz', { name: 'changed_at' })
  changedAt: Date

  @ApiProperty({
    description: 'The whole row before the change. Null on an insert',
    nullable: true,
    required: false
  })
  @Column('jsonb', { name: 'old_data', nullable: true })
  oldData: Record<string, unknown> | null

  @ApiProperty({
    description: 'The whole row after the change. Null on a delete',
    nullable: true,
    required: false
  })
  @Column('jsonb', { name: 'new_data', nullable: true })
  newData: Record<string, unknown> | null

  @ApiProperty({
    example: ['price', 'stock'],
    description:
      'Column names that differ between old_data and new_data. Empty on insert and delete',
    type: [String]
  })
  @Column('text', { name: 'changed_fields', array: true })
  changedFields: string[]
}
