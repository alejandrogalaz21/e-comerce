import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { CredentialsService } from './credentials.service'
import { CredentialsController } from './credentials.controller'
import { Credential } from './entities/credential.entity'
import { Client } from '@/modules/clients/entities/client.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Credential, Client])],
  controllers: [CredentialsController],
  providers: [CredentialsService]
})
export class CredentialsModule {}
