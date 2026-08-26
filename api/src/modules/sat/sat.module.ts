import { Module } from '@nestjs/common'
import { SatDownloadModule } from '@/shared/sat/sat-download.module'
import { SatController } from './sat.controller'

@Module({
  imports: [SatDownloadModule],
  controllers: [SatController]
})
export class SatModule {}
