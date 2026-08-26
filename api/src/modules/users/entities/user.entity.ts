import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm'

import { Exclude } from 'class-transformer'

// Enum for user roles
export enum UserRole {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER'
}
// Enum for user status
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BANNED = 'BANNED',
  PENDING = 'PENDING',
  DELETED = 'DELETED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED'
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column()
  lastName: string

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
  })
  role: UserRole

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE
  })
  status: UserStatus

  @Column({ nullable: true })
  photoURL: string

  @Column()
  phone: string

  @Column({ nullable: true })
  address?: string

  @Column({ nullable: true })
  postalCode?: string

  @Column({ nullable: true })
  city: string

  @Column({ nullable: true })
  country: string

  @Column({ nullable: true })
  state: string

  @Column({ nullable: true })
  age: number

  @Column({ unique: true })
  email: string

  @Column()
  @Exclude()
  password: string

  @Column({ nullable: true })
  @Exclude()
  refreshToken?: string

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP'
  })
  updatedAt: Date
}
