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
import { ApiTags } from '@nestjs/swagger'

import { Public } from '@/common/decorators/public.decorator'

import { PaginationDTO } from '@/common/dto/pagination.dto'

import {
  ApiCreateProduct,
  ApiDeleteProduct,
  ApiDiscontinueProduct,
  ApiGetProduct,
  ApiListProductCategories,
  ApiListProductHistory,
  ApiListProducts,
  ApiRestoreProduct,
  ApiUpdateProduct
} from './docs/products.api-docs'
import { CreateProductDto } from './dto/create-product.dto'
import { ProductFiltersDto } from './dto/product-filters.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { ProductsService } from './products.service'

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiCreateProduct()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto)
  }

  @Get()
  @Public()
  @ApiListProducts()
  findAll(@Query() filters: ProductFiltersDto) {
    return this.productsService.findAll(filters)
  }

  @Get('categories')
  @Public()
  @ApiListProductCategories()
  findCategories() {
    return this.productsService.findCategories()
  }

  @Get(':id/history')
  @ApiListProductHistory()
  findHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filters: PaginationDTO
  ) {
    return this.productsService.findHistory(id, filters)
  }

  @Patch(':id/discontinue')
  @ApiDiscontinueProduct()
  discontinue(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.discontinue(id)
  }

  @Patch(':id/restore')
  @ApiRestoreProduct()
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.restore(id)
  }

  @Get(':id')
  @Public()
  @ApiGetProduct()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id)
  }

  @Patch(':id')
  @ApiUpdateProduct()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto
  ) {
    return this.productsService.update(id, updateProductDto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteProduct()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id)
  }
}
