import { Module } from '@nestjs/common'
import { SatDownloadService } from './sat-download.service'

@Module({
  providers: [SatDownloadService],
  exports: [SatDownloadService]
})
export class SatDownloadModule {}
