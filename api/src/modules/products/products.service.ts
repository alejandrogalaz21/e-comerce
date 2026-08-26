import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { PaginationDTO } from '@/common/dto/pagination.dto'
import { PaginationHelper } from '@/common/pagination/pagination.helper'
import { PaginationResponseBuilder } from '@/common/pagination/pagination-response.builder'

import { Product } from './entities/product.entity'
import { validate as isUUID } from 'uuid'

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService')

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly paginationBuilder: PaginationResponseBuilder<Product>
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const product = this.productRepository.create(createProductDto)
      return await this.productRepository.save(product)
    } catch (error) {
      console.log(error)
      this.handleDBExceptions(error)
    }
  }

  async findAll(paginationDto: PaginationDTO) {
    const { page, limit, offset } = PaginationHelper.parse(paginationDto)

    const [products, total] = await this.productRepository.findAndCount({
      take: limit,
      skip: offset
      // TODO: relaciones
    })

    return this.paginationBuilder.build(products, total, page, limit)
  }

  async findOne(term: string) {
    let product: Product

    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term })
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder()
      product = await queryBuilder
        .where('UPPER(title) =:title or slug =:slug', {
          title: term.toUpperCase(),
          slug: term.toLowerCase()
        })
        .getOne()
    }

    if (!product) throw new NotFoundException(`Product with ${term} not found`)

    return product
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`
  }

  remove(id: number) {
    return `This action removes a #${id} product`
  }

  /**
   * Handles database exceptions by checking the error code and throwing appropriate HTTP exceptions.
   * If the error code is '23505' (unique constraint violation), throws a BadRequestException with the error detail.
   * For all other errors, logs the error and throws an InternalServerErrorException with a generic message.
   *
   * @param error - The error object thrown by the database operation.
   * @throws {BadRequestException} If the error code is '23505'.
   * @throws {InternalServerErrorException} For all other errors.
   */
  private handleDBExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail)

    this.logger.error(error)
    throw new InternalServerErrorException(
      'Unexpected error, check server logs'
    )
  }
}
