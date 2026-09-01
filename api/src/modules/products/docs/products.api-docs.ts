import { applyDecorators } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse
} from '@nestjs/swagger'

import {
  ApiInvalidUuidResponse,
  ApiPaginatedResponse,
  ApiPaginationQuery,
  ApiUnauthorizedResponse,
  ApiValidationErrorResponse
} from '@/common/swagger/api-responses'

import { ProductCategoryDto } from '../dto/product-category.dto'
import {
  PRODUCT_SORT_DIRECTIONS,
  PRODUCT_SORT_FIELDS,
  PRODUCT_STATUSES
} from '../dto/product-filters.dto'
import { Product } from '../entities/product.entity'

const DUPLICATE_SKU = ApiResponse({
  status: 409,
  description: 'Duplicate SKU: DUPLICATE_RESOURCE'
})

export const ApiCreateProduct = () =>
  applyDecorators(
    ApiBearerAuth('jwt'),
    ApiOperation({ summary: 'Create a product' }),
    ApiResponse({ status: 201, description: 'Product created', type: Product }),
    ApiUnauthorizedResponse(),
    ApiValidationErrorResponse(),
    DUPLICATE_SKU
  )

export const ApiListProducts = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List products with pagination, search and filters'
    }),
    ApiPaginationQuery(10),
    ApiQuery({
      name: 'q',
      required: false,
      example: 'camping',
      description:
        'Free-text search, case-insensitive, matched against name, sku, description and category'
    }),
    ApiQuery({
      name: 'category',
      required: false,
      example: 'Electronics,Tools',
      description:
        'Category filter, case-insensitive. Accepts several categories separated by commas'
    }),
    ApiQuery({
      name: 'minPrice',
      required: false,
      example: '10',
      description: 'Minimum price, inclusive'
    }),
    ApiQuery({
      name: 'maxPrice',
      required: false,
      example: '50',
      description: 'Maximum price, inclusive. Must not be lower than minPrice'
    }),
    ApiQuery({
      name: 'inStock',
      required: false,
      example: 'true',
      description:
        'true returns only products with stock, false returns only sold out products. Omit to include both'
    }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: [...PRODUCT_STATUSES],
      example: 'active',
      description:
        'Catalog status. Defaults to active, so a caller that omits it never sees discontinued products'
    }),
    ApiQuery({
      name: 'sortBy',
      required: false,
      enum: [...PRODUCT_SORT_FIELDS],
      example: 'updatedAt',
      description: 'Sort field. Defaults to createdAt'
    }),
    ApiQuery({
      name: 'sortDir',
      required: false,
      enum: [...PRODUCT_SORT_DIRECTIONS],
      example: 'desc',
      description: 'Sort direction. Defaults to desc'
    }),
    ApiPaginatedResponse('Product'),
    ApiValidationErrorResponse()
  )

export const ApiListProductCategories = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List the catalog categories with their product count'
    }),
    ApiResponse({
      status: 200,
      description: 'Categories in alphabetical order, not paginated',
      type: [ProductCategoryDto]
    })
  )

export const ApiGetProduct = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get a product by id' }),
    ApiResponse({ status: 200, description: 'Product found', type: Product }),
    ApiInvalidUuidResponse(),
    ApiResponse({ status: 404, description: 'Product not found: NOT_FOUND' })
  )

export const ApiUpdateProduct = () =>
  applyDecorators(
    ApiBearerAuth('jwt'),
    ApiOperation({ summary: 'Update a product' }),
    ApiResponse({ status: 200, description: 'Product updated', type: Product }),
    ApiResponse({
      status: 400,
      description: 'Validation error or invalid UUID'
    }),
    ApiUnauthorizedResponse(),
    ApiResponse({ status: 404, description: 'Product not found' }),
    DUPLICATE_SKU
  )

export const ApiDeleteProduct = () =>
  applyDecorators(
    ApiBearerAuth('jwt'),
    ApiOperation({ summary: 'Delete a product' }),
    ApiResponse({ status: 204, description: 'Product deleted, no body' }),
    ApiInvalidUuidResponse(),
    ApiUnauthorizedResponse(),
    ApiResponse({ status: 404, description: 'Product not found' }),
    ApiResponse({
      status: 409,
      description:
        'The product appears in an order and cannot be removed: RESOURCE_IN_USE'
    })
  )

export const ApiDiscontinueProduct = () =>
  applyDecorators(
    ApiBearerAuth('jwt'),
    ApiOperation({
      summary: 'Take a product off the catalog',
      description:
        'The product stops being sold and disappears from every public surface, while the orders that contain it keep pointing at it. Idempotent: retiring an already retired product keeps the original date.'
    }),
    ApiResponse({
      status: 200,
      description: 'Product discontinued',
      type: Product
    }),
    ApiInvalidUuidResponse(),
    ApiUnauthorizedResponse(),
    ApiResponse({ status: 404, description: 'Product not found' })
  )

export const ApiRestoreProduct = () =>
  applyDecorators(
    ApiBearerAuth('jwt'),
    ApiOperation({
      summary: 'Put a discontinued product back on the catalog',
      description:
        'Idempotent: restoring a product that is already on sale succeeds and changes nothing.'
    }),
    ApiResponse({
      status: 200,
      description: 'Product restored',
      type: Product
    }),
    ApiInvalidUuidResponse(),
    ApiUnauthorizedResponse(),
    ApiResponse({ status: 404, description: 'Product not found' })
  )

export const ApiListProductHistory = () =>
  applyDecorators(
    ApiBearerAuth('jwt'),
    ApiOperation({
      summary: 'Read the change history of a product',
      description:
        'Every insert, update and delete, written by a database trigger rather than the service, so a change made through the CSV import or through direct SQL is recorded the same way. Newest first.'
    }),
    ApiPaginationQuery(20),
    ApiPaginatedResponse('ProductHistory'),
    ApiInvalidUuidResponse(),
    ApiUnauthorizedResponse(),
    ApiResponse({ status: 404, description: 'Product not found' })
  )
