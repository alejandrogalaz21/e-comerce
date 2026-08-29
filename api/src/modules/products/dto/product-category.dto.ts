import { ApiProperty } from '@nestjs/swagger'

export class ProductCategoryDto {
  @ApiProperty({
    example: 'Electronics',
    description: 'Category as stored in the catalog'
  })
  category: string

  @ApiProperty({
    example: 7,
    description: 'Number of products in this category'
  })
  count: number
}
