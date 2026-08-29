import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn
} from 'typeorm'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ImportBatchReport } from './import-result.interface'

@Entity('import_batches')
export class ImportBatch {
  @ApiProperty({
    example: '0d6cd087-3f2e-4f30-b0aa-cf9c93b1c0d5',
    description: 'Import batch unique identifier (UUID)'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ApiProperty({
    example: 'loanpro-sample.csv',
    description: 'Original uploaded file name',
    maxLength: 255
  })
  @Column('varchar', { length: 255 })
  filename: string

  @ApiProperty({
    example: 'completed',
    description: 'Batch status: processing, completed or failed',
    maxLength: 20
  })
  @Column('varchar', { length: 20, default: 'processing' })
  status: string

  @ApiPropertyOptional({
    example: 'demo@demo.com',
    description:
      'Email of the authenticated user who ran the import, taken from the access token. Null for batches created before attribution existed',
    maxLength: 255,
    nullable: true
  })
  @Column('varchar', { name: 'imported_by', length: 255, nullable: true })
  importedBy: string | null

  @ApiProperty({ example: 97, description: 'Data rows found in the file' })
  @Column('int', { name: 'total_rows', default: 0 })
  totalRows: number

  @ApiProperty({ example: 87, description: 'Rows inserted as new products' })
  @Column('int', { default: 0 })
  inserted: number

  @ApiProperty({ example: 3, description: 'Rows that updated an existing SKU' })
  @Column('int', { default: 0 })
  updated: number

  @ApiProperty({
    example: 0,
    description: 'Rows identical to the existing product, no-op'
  })
  @Column('int', { default: 0 })
  unchanged: number

  @ApiProperty({ example: 5, description: 'Rows rejected by validation' })
  @Column('int', { default: 0 })
  rejected: number

  @ApiProperty({ example: 2, description: 'Fully empty rows skipped' })
  @Column('int', { name: 'skipped_empty', default: 0 })
  skippedEmpty: number

  @ApiProperty({
    description:
      'Full report: { rejected: [...], warnings: [...], created: [...] }',
    nullable: true,
    required: false
  })
  @Column('jsonb', { nullable: true })
  report: ImportBatchReport | null

  @ApiProperty({ example: '2026-08-26T10:00:00.000Z' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
