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
import {
  DEFAULT_PRODUCT_SORT_DIRECTION,
  DEFAULT_PRODUCT_SORT_FIELD,
  ProductFiltersDto,
  ProductSortField
} from './dto/product-filters.dto'
import { ProductCategoryDto } from './dto/product-category.dto'
import { PaginationHelper } from '@/common/pagination/pagination.helper'
import { PaginationResponseBuilder } from '@/common/pagination/pagination-response.builder'
import { escapeLikeWildcards } from '@/common/transformers/sanitize.transformer'

import { Product } from './entities/product.entity'

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name)

  private static readonly SORT_COLUMNS: Record<ProductSortField, string> = {
    name: 'product.name',
    price: 'product.price',
    stock: 'product.stock',
    createdAt: 'product.createdAt',
    updatedAt: 'product.updatedAt'
  }

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

    const sortBy = filters.sortBy ?? DEFAULT_PRODUCT_SORT_FIELD
    const sortColumn =
      ProductsService.SORT_COLUMNS[sortBy] ??
      ProductsService.SORT_COLUMNS[DEFAULT_PRODUCT_SORT_FIELD]
    const sortDirection =
      (filters.sortDir ?? DEFAULT_PRODUCT_SORT_DIRECTION) === 'asc'
        ? 'ASC'
        : 'DESC'

    const query = this.productRepository
      .createQueryBuilder('product')
      .orderBy(sortColumn, sortDirection)
      .addOrderBy('product.id', 'ASC')
      .skip(offset)
      .take(limit)

    const terms = filters.q?.map(value => value.trim()).filter(Boolean)
    if (terms?.length) {
      // Several terms are a union: the admin asks for "these products", not for
      // rows matching all of them at once.
      const clauses = terms.map(
        (_, index) =>
          `(product.name ILIKE :term${index} OR product.sku ILIKE :term${index} OR product.description ILIKE :term${index} OR product.category ILIKE :term${index})`
      )
      const parameters = Object.fromEntries(
        terms.map((term, index) => [
          `term${index}`,
          `%${escapeLikeWildcards(term)}%`
        ])
      )

      query.andWhere(`(${clauses.join(' OR ')})`, parameters)
    }

    const categories = filters.category?.filter(value => value.trim())
    if (categories?.length) {
      query.andWhere('LOWER(product.category) IN (:...categories)', {
        categories: categories.map(value => value.trim().toLowerCase())
      })
    }

    if (filters.minPrice !== undefined) {
      query.andWhere('product.price >= :minPrice', {
        minPrice: filters.minPrice
      })
    }

    if (filters.maxPrice !== undefined) {
      query.andWhere('product.price <= :maxPrice', {
        maxPrice: filters.maxPrice
      })
    }

    if (filters.inStock !== undefined) {
      query.andWhere(
        filters.inStock ? 'product.stock > 0' : 'product.stock = 0'
      )
    }

    const [products, total] = await query.getManyAndCount()

    return this.paginationBuilder.build(products, total, page, limit)
  }

  async findCategories(): Promise<ProductCategoryDto[]> {
    const rows = await this.productRepository
      .createQueryBuilder('product')
      .select('product.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('product.category')
      .orderBy('product.category', 'ASC')
      .getRawMany<{ category: string; count: string }>()

    return rows.map(row => ({
      category: row.category,
      count: Number(row.count)
    }))
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
