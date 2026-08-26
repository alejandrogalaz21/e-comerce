// src/shared/whatsapp/whatsapp.module.ts
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { WhatsAppService } from './whatsapp.service'
import { UsersModule } from '@/modules/users/users.module'

@Module({
  imports: [ConfigModule, UsersModule],
  providers: [WhatsAppService],
  exports: [WhatsAppService]
})
export class WhatsAppModule {}
