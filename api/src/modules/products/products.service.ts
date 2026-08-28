import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DeepPartial, Repository } from 'typeorm'

import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { ProductFiltersDto } from './dto/product-filters.dto'
import { PaginationHelper } from '@/common/pagination/pagination.helper'
import { PaginationResponseBuilder } from '@/common/pagination/pagination-response.builder'
import { escapeLikeWildcards } from '@/common/transformers/sanitize.transformer'

import { Product } from './entities/product.entity'

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name)

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly paginationBuilder: PaginationResponseBuilder<Product>
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    try {
      const product = this.productRepository.create(
        this.toEntityData(createProductDto)
      )
      return await this.productRepository.save(product)
    } catch (error) {
      this.handleDBExceptions(error, createProductDto.sku)
    }
  }

  async findAll(filters: ProductFiltersDto = {}) {
    const { page, limit, offset } = PaginationHelper.parse(filters)

    const query = this.productRepository
      .createQueryBuilder('product')
      .orderBy('product.createdAt', 'DESC')
      .skip(offset)
      .take(limit)

    const term = filters.q?.trim()
    if (term) {
      query.andWhere(
        `(product.name ILIKE :term OR product.sku ILIKE :term OR product.description ILIKE :term OR product.category ILIKE :term)`,
        { term: `%${escapeLikeWildcards(term)}%` }
      )
    }

    const category = filters.category?.trim()
    if (category) {
      query.andWhere('LOWER(product.category) = LOWER(:category)', { category })
    }

    const [products, total] = await query.getManyAndCount()

    return this.paginationBuilder.build(products, total, page, limit)
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOneBy({ id })

    if (!product)
      throw new NotFoundException(`Product with id '${id}' not found`)

    return product
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto
  ): Promise<Product> {
    const product = await this.findOne(id)
    this.productRepository.merge(product, this.toEntityData(updateProductDto))

    try {
      return await this.productRepository.save(product)
    } catch (error) {
      this.handleDBExceptions(error, updateProductDto.sku)
    }
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id)
    await this.productRepository.remove(product)
  }

  private toEntityData(
    dto: CreateProductDto | UpdateProductDto
  ): DeepPartial<Product> {
    const { price, weightKg, category, ...rest } = dto
    const data: DeepPartial<Product> = { ...rest }

    if (price !== undefined) data.price = price.toFixed(2)
    if (weightKg !== undefined) data.weightKg = weightKg.toString()
    if (category !== undefined)
      data.category = category.trim() || 'Uncategorized'

    return data
  }

  private handleDBExceptions(error: unknown, sku?: string): never {
    if ((error as { code?: string })?.code === '23505')
      throw new ConflictException(`Product with sku '${sku}' already exists`)

    this.logger.error(error)
    throw new InternalServerErrorException(
      'Unexpected error, check server logs'
    )
  }
}
