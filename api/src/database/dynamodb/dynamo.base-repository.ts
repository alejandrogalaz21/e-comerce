// src/database/dynamodb/dynamo.base-repository.ts
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb'

export abstract class DynamoBaseRepository<T> {
  constructor(
    protected readonly client: DynamoDBDocumentClient,
    protected readonly tableName: string
  ) {}

  async create(item: T) {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item
      })
    )
    return item
  }

  async findOne(key: any) {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: key
      })
    )
    return result.Item as T
  }

  async delete(key: any) {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: key
      })
    )
    return { deleted: true }
  }
}
