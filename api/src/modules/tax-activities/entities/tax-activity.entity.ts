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

@Entity({ name: 'tax_activities' })
@Check('CHK_tax_activity_percentage', 'percentage BETWEEN 0 AND 100')
export class TaxActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => TaxProfile, profile => profile.activities, {
    onDelete: 'CASCADE'
  })
  taxProfile: TaxProfile

  @Column({ name: 'activity', type: 'text', nullable: true })
  activity?: string

  @Column({ name: 'percentage', type: 'int', nullable: true })
  percentage?: number

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
