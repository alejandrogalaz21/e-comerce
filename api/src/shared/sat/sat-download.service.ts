// ./src/shared/sat/sat-download.service.ts

import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import {
  Fiel,
  HttpsWebClient,
  FielRequestBuilder,
  Service,
  ServiceEndpoints,
  QueryParameters,
  DateTimePeriod,
  DownloadType,
  RequestType,
  DocumentStatus
} from '@nodecfdi/sat-ws-descarga-masiva'

export interface SatDownloadResult {
  requestId: string
  packageIds: string[]
  packagesSaved: string[]
}

export interface SatDownloadParams {
  rfc: string
  keyPassword: string
  downloadType?: 'issued' | 'received'
  requestType?: 'xml' | 'metadata'
  start: string
  end: string
  pollIntervalMs?: number
  outputDir?: string
}

interface SatConfig {
  cerPath: string
  keyPath: string
  outputDir: string
  pollIntervalMs: number
}

@Injectable()
export class SatDownloadService {
  private readonly logger = new Logger(SatDownloadService.name)

  constructor(private readonly config: ConfigService) {}

  private getSatConfig(): SatConfig {
    const sat = this.config.get<SatConfig>('app.sat')
    if (!sat) {
      throw new Error('Missing SAT configuration under app.sat')
    }
    if (!sat.cerPath) throw new Error('Missing SAT_CER_PATH in configuration')
    if (!sat.keyPath) throw new Error('Missing SAT_KEY_PATH in configuration')
    return sat
  }

  private resolvePath(filePath: string): string {
    return resolve(process.cwd(), filePath)
  }

  private delay(ms: number) {
    return new Promise(resolveDelay => setTimeout(resolveDelay, ms))
  }

  async downloadMassiveCfdi(
    params: SatDownloadParams
  ): Promise<SatDownloadResult> {
    const satConfig = this.getSatConfig()
    const cerPath = this.resolvePath(satConfig.cerPath)
    const keyPath = this.resolvePath(satConfig.keyPath)

    console.log({ cerPath, keyPath })

    const downloadType = (params.downloadType || 'issued').toLowerCase()
    const requestType = (params.requestType || 'xml').toLowerCase()
    const { rfc, keyPassword, start, end } = params

    const pollIntervalMs = Number(
      params.pollIntervalMs ?? satConfig.pollIntervalMs ?? 60_000
    )
    const outputDir = params.outputDir || satConfig.outputDir || 'out'

    const fiel = Fiel.create(
      readFileSync(cerPath, 'binary'),
      readFileSync(keyPath, 'binary'),
      keyPassword
    )

    if (!fiel.isValid()) {
      throw new Error(
        'FIEL is not valid (maybe expired, not a FIEL, or password/files mismatch).'
      )
    }

    const webClient = new HttpsWebClient()
    const requestBuilder = new FielRequestBuilder(fiel)
    const service = new Service(
      requestBuilder,
      webClient,
      undefined,
      ServiceEndpoints.cfdi()
    )

    const period = DateTimePeriod.createFromValues(start, end)
    let queryParams = QueryParameters.create(period)

    queryParams =
      downloadType === 'received'
        ? queryParams.withDownloadType(new DownloadType('received'))
        : queryParams.withDownloadType(new DownloadType('issued'))

    queryParams =
      requestType === 'metadata'
        ? queryParams.withRequestType(new RequestType('metadata'))
        : queryParams.withRequestType(new RequestType('xml'))

    if (downloadType === 'received' && requestType === 'xml') {
      queryParams = queryParams.withDocumentStatus(new DocumentStatus('active'))
    }

    const errors = queryParams.validate?.() || []
    if (errors.length > 0) {
      throw new Error(`Query validation errors: ${errors.join('; ')}`)
    }

    this.logger.log('Submitting query to SAT...')
    const query = await service.query(queryParams)

    if (!query.getStatus().isAccepted()) {
      throw new Error(`Query rejected: ${query.getStatus().getMessage()}`)
    }

    const requestId = query.getRequestId()
    this.logger.log(`Request accepted. requestId=${requestId}`)

    while (true) {
      const verify = await service.verify(requestId)

      if (!verify.getStatus().isAccepted()) {
        throw new Error(`Verify failed: ${verify.getStatus().getMessage()}`)
      }

      const statusRequest = verify.getStatusRequest()
      const codeRequest = verify.getCodeRequest()

      const statusName = statusRequest.getEntryId?.() ?? 'Unknown'
      const statusMsg = statusRequest.toJSON?.().message ?? ''
      const statusVal = statusRequest.getValue?.()

      const codeName = codeRequest.getEntryId?.() ?? 'Unknown'
      const codeMsg =
        codeRequest.getMessage?.() ?? codeRequest.toJSON?.().message ?? ''
      const codeVal = codeRequest.getValue?.()

      this.logger.log(
        `Verify status: ${statusName} (${statusVal ?? '?'}) ${statusMsg} | code: ${codeName} (${codeVal ?? '?'}) ${codeMsg}`
      )

      if (
        statusRequest.isTypeOf?.('Expired') ||
        statusRequest.isTypeOf?.('Failure') ||
        statusRequest.isTypeOf?.('Rejected')
      ) {
        throw new Error(
          `Request cannot be completed: ${statusName} (${statusVal ?? '?'}) ${statusMsg} | code: ${codeName} (${codeVal ?? '?'}) ${codeMsg}`
        )
      }

      if (statusRequest.isTypeOf?.('Finished')) {
        const packageIds = Array.from(verify.getPackageIds())
        const savedPaths: string[] = []

        mkdirSync(outputDir, { recursive: true })

        for (const packageId of packageIds) {
          this.logger.log(`Downloading package ${packageId}...`)
          const download = await service.download(packageId)

          if (!download.getStatus().isAccepted()) {
            this.logger.warn(
              `Package ${packageId} failed: ${download.getStatus().getMessage()}`
            )
            continue
          }

          const zipPath = resolve(outputDir, `${packageId}.zip`)
          writeFileSync(
            zipPath,
            Buffer.from(download.getPackageContent(), 'base64')
          )
          savedPaths.push(zipPath)
          this.logger.log(`Package saved: ${zipPath}`)
        }

        this.logger.log('Download completed.')
        return { requestId, packageIds, packagesSaved: savedPaths }
      }

      await this.delay(pollIntervalMs)
    }
  }
}
