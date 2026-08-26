import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { Client } from '@/modules/clients/entities/client.entity'
import { TaxAddress } from '@/modules/tax-addresses/entities/tax-address.entity'
import { TaxRegime } from '@/modules/tax-regimes/entities/tax-regime.entity'
import { TaxActivity } from '@/modules/tax-activities/entities/tax-activity.entity'
import { TaxObligation } from '@/modules/tax-obligations/entities/tax-obligation.entity'

@Entity({ name: 'tax_profiles' })
export class TaxProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Client, client => client.taxProfiles, {
    onDelete: 'CASCADE'
  })
  client: Client

  @Column({ name: 'rfc', type: 'varchar', length: 13 })
  rfc: string

  @Column({ name: 'commercial_name', type: 'text', nullable: true })
  commercialName?: string

  @Column({ name: 'status', type: 'varchar', length: 20, nullable: true })
  status?: string

  @Column({ name: 'start_operations', type: 'date', nullable: true })
  startOperations?: string

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

  @OneToMany(() => TaxAddress, address => address.taxProfile)
  addresses?: TaxAddress[]

  @OneToMany(() => TaxRegime, regime => regime.taxProfile)
  regimes?: TaxRegime[]

  @OneToMany(() => TaxActivity, activity => activity.taxProfile)
  activities?: TaxActivity[]

  @OneToMany(() => TaxObligation, obligation => obligation.taxProfile)
  obligations?: TaxObligation[]
}
