import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { TaxProfile } from '@/modules/tax-profiles/entities/tax-profile.entity'

@Entity({ name: 'tax_obligations' })
export class TaxObligation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => TaxProfile, profile => profile.obligations, {
    onDelete: 'CASCADE'
  })
  taxProfile: TaxProfile

  @Column({ name: 'obligation', type: 'text', nullable: true })
  obligation?: string

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP'
  })
  createdAt: Date

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP'
  })
  updatedAt: Date
}
