import { Injectable, NotFoundException, Optional } from '@nestjs/common'
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
import { translateDatabaseError } from '@/common/filters/database-error.translator'
import { CacheService } from '@/database/redis/cache.service'

import { Product } from './entities/product.entity'

@Injectable()
export class ProductsService {
  private static readonly SORT_COLUMNS: Record<ProductSortField, string> = {
    name: 'product.name',
    price: 'product.price',
    stock: 'product.stock',
    createdAt: 'product.createdAt',
    updatedAt: 'product.updatedAt'
  }

  /** Everything the catalog caches lives under this prefix, so one write clears it all. */
  static readonly CACHE_PREFIX = 'products'

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly paginationBuilder: PaginationResponseBuilder<Product>,
    // Optional so the service still works — uncached — wherever Redis is not
    // wired, which is every unit test and any deployment without it.
    @Optional() private readonly cache?: CacheService
  ) {}

  /** Public so the import module can clear the catalog once per batch. */
  async invalidateCache(): Promise<void> {
    await this.cache?.invalidatePrefix(ProductsService.CACHE_PREFIX)
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    try {
      const product = this.productRepository.create(
        this.toEntityData(createProductDto)
      )
      const saved = await this.productRepository.save(product)
      await this.invalidateCache()

      return saved
    } catch (error) {
      translateDatabaseError(error, {
        resource: 'Product',
        field: 'sku',
        identifier: createProductDto.sku
      })
    }
  }

  async findAll(filters: ProductFiltersDto = {}) {
    const cacheKey = CacheService.buildKey(
      `${ProductsService.CACHE_PREFIX}:list`,
      filters as Record<string, unknown>
    )
    const cached =
      await this.cache?.get<
        ReturnType<PaginationResponseBuilder<Product>['build']>
      >(cacheKey)

    if (cached) return cached

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
    const response = this.paginationBuilder.build(products, total, page, limit)

    await this.cache?.set(cacheKey, response)

    return response
  }

  async findCategories(): Promise<ProductCategoryDto[]> {
    const cacheKey = `${ProductsService.CACHE_PREFIX}:categories`
    const cached = await this.cache?.get<ProductCategoryDto[]>(cacheKey)

    if (cached) return cached

    const rows = await this.productRepository
      .createQueryBuilder('product')
      .select('product.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('product.category')
      .orderBy('product.category', 'ASC')
      .getRawMany<{ category: string; count: string }>()

    const categories = rows.map(row => ({
      category: row.category,
      count: Number(row.count)
    }))

    await this.cache?.set(cacheKey, categories)

    return categories
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
      const saved = await this.productRepository.save(product)
      await this.invalidateCache()

      return saved
    } catch (error) {
      translateDatabaseError(error, {
        resource: 'Product',
        field: 'sku',
        identifier: updateProductDto.sku
      })
    }
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id)

    try {
      await this.productRepository.remove(product)
      await this.invalidateCache()
    } catch (error) {
      // A product that appears in an order is protected by a RESTRICT foreign
      // key. That refusal is a conflict, not an internal failure.
      translateDatabaseError(error, {
        resource: 'Product',
        field: 'sku',
        identifier: product.sku
      })
    }
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
}
