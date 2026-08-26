import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { TaxProfile } from '@/modules/tax-profiles/entities/tax-profile.entity'

@Entity({ name: 'tax_addresses' })
export class TaxAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => TaxProfile, profile => profile.addresses, {
    onDelete: 'CASCADE'
  })
  taxProfile: TaxProfile

  @Column({ name: 'postal_code', type: 'varchar', length: 10 })
  postalCode: string

  @Column({ name: 'street_name', type: 'text', nullable: true })
  streetName?: string

  @Column({ name: 'neighborhood', type: 'text', nullable: true })
  neighborhood?: string

  @Column({ name: 'exterior_number', type: 'text', nullable: true })
  exteriorNumber?: string

  @Column({ name: 'interior_number', type: 'text', nullable: true })
  interiorNumber?: string

  @Column({ name: 'city', type: 'text', nullable: true })
  city?: string

  @Column({ name: 'state', type: 'text', nullable: true })
  state?: string

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
