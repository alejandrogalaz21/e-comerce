import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn
} from 'typeorm'
import { Client } from '@/modules/clients/entities/client.entity'

@Entity({ name: 'credentials' })
@Unique(['client'])
export class Credential {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Client, client => client.credential, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client

  @Column({ name: 'cer_s3_path', type: 'text' })
  cerS3Path: string

  @Column({ name: 'key_s3_path', type: 'text' })
  keyS3Path: string

  @Column({ name: 'encrypted_password', type: 'bytea' })
  encryptedPassword: Buffer

  @Column({ name: 'encryption_iv', type: 'bytea' })
  encryptionIv: Buffer

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
