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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ProductsService } from './products.service'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { PaginationDTO } from '@/common/dto/pagination.dto'
import { Product } from './entities/product.entity'

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a product' })
  @ApiResponse({ status: 201, description: 'Product created', type: Product })
  @ApiResponse({
    status: 400,
    description: 'Validation error: { statusCode, message: string[], error }'
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate SKU: { statusCode, message, error }'
  })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto)
  }

  @Get()
  @ApiOperation({ summary: 'List products with pagination' })
  @ApiResponse({
    status: 200,
    description:
      'Paginated list: { data: Product[], pagination: { total, per_page, current_page, last_page, from, to } }'
  })
  findAll(@Query() pagination: PaginationDTO) {
    return this.productsService.findAll(pagination)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by id' })
  @ApiResponse({ status: 200, description: 'Product found', type: Product })
  @ApiResponse({ status: 400, description: 'Invalid UUID' })
  @ApiResponse({
    status: 404,
    description: 'Product not found: { statusCode, message, error }'
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated', type: Product })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid UUID'
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Duplicate SKU' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto
  ) {
    return this.productsService.update(id, updateProductDto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({ status: 204, description: 'Product deleted, no body' })
  @ApiResponse({ status: 400, description: 'Invalid UUID' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id)
  }
}
