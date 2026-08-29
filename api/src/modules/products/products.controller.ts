import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { ProductsService } from './products.service'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import {
  PRODUCT_SORT_DIRECTIONS,
  PRODUCT_SORT_FIELDS,
  ProductFiltersDto
} from './dto/product-filters.dto'
import { ProductCategoryDto } from './dto/product-category.dto'
import { Product } from './entities/product.entity'
import { Public } from '@/common/decorators/public.decorator'

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Create a product' })
  @ApiResponse({ status: 201, description: 'Product created', type: Product })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({
    status: 400,
    description:
      'Validation error. VALIDATION_ERROR, with message as the list of failures'
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate SKU: DUPLICATE_RESOURCE'
  })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto)
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'List products with pagination, search and filters'
  })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  @ApiQuery({
    name: 'q',
    required: false,
    example: 'camping',
    description:
      'Free-text search, case-insensitive, matched against name, sku, description and category'
  })
  @ApiQuery({
    name: 'category',
    required: false,
    example: 'Electronics,Tools',
    description:
      'Category filter, case-insensitive. Accepts several categories separated by commas'
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    example: '10',
    description: 'Minimum price, inclusive'
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    example: '50',
    description: 'Maximum price, inclusive. Must not be lower than minPrice'
  })
  @ApiQuery({
    name: 'inStock',
    required: false,
    example: 'true',
    description:
      'true returns only products with stock, false returns only sold out products. Omit to include both'
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: [...PRODUCT_SORT_FIELDS],
    example: 'updatedAt',
    description: 'Sort field. Defaults to createdAt'
  })
  @ApiQuery({
    name: 'sortDir',
    required: false,
    enum: [...PRODUCT_SORT_DIRECTIONS],
    example: 'desc',
    description: 'Sort direction. Defaults to desc'
  })
  @ApiResponse({
    status: 200,
    description:
      'Paginated list: { data: Product[], pagination: { total, per_page, current_page, last_page, from, to } }'
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation error. VALIDATION_ERROR, with message as the list of failures'
  })
  findAll(@Query() filters: ProductFiltersDto) {
    return this.productsService.findAll(filters)
  }

  @Get('categories')
  @Public()
  @ApiOperation({
    summary: 'List the catalog categories with their product count'
  })
  @ApiResponse({
    status: 200,
    description: 'Categories in alphabetical order, not paginated',
    type: [ProductCategoryDto]
  })
  findCategories() {
    return this.productsService.findCategories()
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a product by id' })
  @ApiResponse({ status: 200, description: 'Product found', type: Product })
  @ApiResponse({ status: 400, description: 'Invalid UUID' })
  @ApiResponse({
    status: 404,
    description: 'Product not found: NOT_FOUND'
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id)
  }

  @Patch(':id')
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated', type: Product })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid UUID'
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({
    status: 409,
    description: 'Duplicate SKU: DUPLICATE_RESOURCE'
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto
  ) {
    return this.productsService.update(id, updateProductDto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({ status: 204, description: 'Product deleted, no body' })
  @ApiResponse({ status: 400, description: 'Invalid UUID' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({
    status: 409,
    description:
      'The product appears in an order and cannot be removed: RESOURCE_IN_USE'
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id)
  }
}
