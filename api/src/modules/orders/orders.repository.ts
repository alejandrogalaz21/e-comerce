// src/modules/orders/orders.repository.ts
import { Inject, Injectable } from '@nestjs/common'
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb'
import { DynamoBaseRepository } from '@/database/dynamodb/dynamo.base-repository'
import { Order } from './entities/order.entity'
import { UpdateOrderDto } from './dto/update-order.dto'

/**
 * Repository encapsulating all DynamoDB access for Orders.
 * Extends a generic base repository providing basic CRUD helpers.
 */
@Injectable()
export class OrdersRepository extends DynamoBaseRepository<Order> {
  constructor(@Inject('DYNAMODB_CLIENT') client: DynamoDBDocumentClient) {
    super(client, 'orders')
  }

  /**
   * Retrieves all orders using a DynamoDB Scan. For production-scale systems,
   * prefer Query operations with proper keys and pagination.
   */
  async findAll(): Promise<Order[]> {
    const result = await this.client.send(
      new ScanCommand({ TableName: this.tableName })
    )
    return (result.Items ?? []) as Order[]
  }

  /**
   * Updates an order with the provided partial changes. Uses a dynamic
   * UpdateExpression based on DTO keys.
   */
  async update(
    orderId: string,
    changes: UpdateOrderDto
  ): Promise<Order | null> {
    if (!Object.keys(changes).length) {
      const existing = await this.findOne({ orderId })
      return existing ?? null
    }

    const expressionAttrNames: Record<string, string> = {}
    const expressionAttrValues: Record<string, any> = {}
    const setFragments: string[] = []

    for (const [key, value] of Object.entries(changes)) {
      const nameKey = `#${key}`
      const valueKey = `:${key}`
      expressionAttrNames[nameKey] = key
      expressionAttrValues[valueKey] = value
      setFragments.push(`${nameKey} = ${valueKey}`)
    }
    // Always update updatedAt
    expressionAttrNames['#updatedAt'] = 'updatedAt'
    expressionAttrValues[':updatedAt'] = new Date().toISOString()
    setFragments.push('#updatedAt = :updatedAt')

    const updateExpression = 'SET ' + setFragments.join(', ')

    const result = await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { orderId },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttrNames,
        ExpressionAttributeValues: expressionAttrValues,
        ReturnValues: 'ALL_NEW'
      })
    )

    return result.Attributes as Order
  }
}
