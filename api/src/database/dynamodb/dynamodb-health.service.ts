// src/database/dynamodb/dynamodb-health.service.ts
import { Inject, Injectable } from '@nestjs/common'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { ListTablesCommand } from '@aws-sdk/client-dynamodb'

@Injectable()
export class DynamoDBHealthService {
  constructor(
    @Inject('DYNAMODB_CLIENT')
    private readonly dynamo: DynamoDBDocumentClient
  ) {}

  async checkConnection() {
    try {
      // List tables to verify connection without requiring a specific table
      const command = new ListTablesCommand({ Limit: 1 })
      await this.dynamo.send(command)

      return {
        ok: true,
        message: 'DynamoDB connection OK',
        status: 'healthy'
      }
    } catch (error) {
      return {
        ok: false,
        message: 'Failed to connect to DynamoDB',
        status: 'unhealthy',
        error: error.message
      }
    }
  }
}
