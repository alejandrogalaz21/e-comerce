import { Body, Controller, Post } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { SatDownloadService } from '@/shared/sat/sat-download.service'
import { SatDownloadDto } from './dto/sat-download.dto'

@ApiTags('sat')
@Controller('sat')
export class SatController {
  constructor(private readonly satDownloadService: SatDownloadService) {}

  @Post('download')
  @ApiOperation({ summary: 'Solicita y descarga CFDI masivo (SAT)' })
  download(@Body() body: SatDownloadDto) {
    console.log('Download request received:', body)
    return this.satDownloadService.downloadMassiveCfdi(body)
  }
}
