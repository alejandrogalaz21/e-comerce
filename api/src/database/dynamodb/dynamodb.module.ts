// src/database/dynamodb/dynamodb.module.ts
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { DynamoDBHealthService } from './dynamodb-health.service'

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'DYNAMODB_CLIENT',
      useFactory: (configService: ConfigService) => {
        const client = new DynamoDBClient({
          region: configService.get<string>('app.ddb.region'),
          endpoint: configService.get<string>('app.ddb.endpoint'),
          credentials: {
            accessKeyId: configService.get<string>('app.ddb.accessKeyId'),
            secretAccessKey: configService.get<string>(
              'app.ddb.secretAccessKey'
            )
          }
        })

        return DynamoDBDocumentClient.from(client, {
          marshallOptions: {
            removeUndefinedValues: true,
            convertClassInstanceToMap: true
          }
        })
      },
      inject: [ConfigService]
    },
    DynamoDBHealthService
  ],
  exports: ['DYNAMODB_CLIENT', DynamoDBHealthService]
})
export class DynamoDbModule {}
