import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { TaxProfile } from '@/modules/tax-profiles/entities/tax-profile.entity'

@Entity({ name: 'tax_regimes' })
@Check(
  'CHK_tax_regimes_dates',
  '"end_date" IS NULL OR "end_date" >= "start_date"'
)
export class TaxRegime {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => TaxProfile, profile => profile.regimes, {
    onDelete: 'CASCADE'
  })
  taxProfile: TaxProfile

  @Column({ name: 'regime_name', type: 'text', nullable: true })
  regimeName?: string

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: string

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string | null

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
