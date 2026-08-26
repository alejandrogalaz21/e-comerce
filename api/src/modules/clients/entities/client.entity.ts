import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany
} from 'typeorm'
import { Credential } from '@/modules/credentials/entities/credential.entity'
import { TaxProfile } from '@/modules/tax-profiles/entities/tax-profile.entity'

export enum ClientStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

@Entity({ name: 'clients' })
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'rfc', type: 'varchar', length: 13, unique: true })
  rfc: string

  @Column({ name: 'first_name', type: 'text' })
  firstName: string

  @Column({ name: 'last_name', type: 'text' })
  lastName: string

  @Column({ name: 'second_last_name', type: 'text', nullable: true })
  secondLastName?: string

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
  phone?: string

  @Column({ name: 'legal_name', type: 'text' })
  legalName: string

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: ClientStatus.ACTIVE
  })
  status: ClientStatus

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

  @OneToOne(() => Credential, credential => credential.client)
  credential?: Credential

  @OneToMany(() => TaxProfile, profile => profile.client)
  taxProfiles?: TaxProfile[]
}
