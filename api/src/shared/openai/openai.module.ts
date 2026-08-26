// src/shared/openai/openai.module.ts
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { OpenAIService } from './openai.service'
import { UsersModule } from '@/modules/users/users.module'

@Module({
  imports: [ConfigModule, UsersModule],
  providers: [OpenAIService],
  exports: [OpenAIService]
})
export class OpenAIModule {}
