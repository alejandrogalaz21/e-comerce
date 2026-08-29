import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as request from 'supertest'

import { ProductsController } from './products.controller'
import { ProductsService } from './products.service'

describe('ProductsController routing', () => {
  let app: INestApplication

  const productsService = {
    findAll: jest.fn().mockResolvedValue({ data: [], pagination: {} }),
    findCategories: jest
      .fn()
      .mockResolvedValue([{ category: 'Electronics', count: 7 }]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: productsService }]
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true }
      })
    )
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('routes /products/categories to findCategories, not to the :id handler', async () => {
    const response = await request(app.getHttpServer())
      .get('/products/categories')
      .expect(200)

    expect(productsService.findCategories).toHaveBeenCalled()
    expect(productsService.findOne).not.toHaveBeenCalled()
    expect(response.body).toEqual([{ category: 'Electronics', count: 7 }])
  })

  it('still rejects a non uuid product id', async () => {
    await request(app.getHttpServer()).get('/products/not-a-uuid').expect(400)

    expect(productsService.findOne).not.toHaveBeenCalled()
  })

  it('rejects an invalid price range before reaching the service', async () => {
    await request(app.getHttpServer())
      .get('/products')
      .query({ minPrice: '50', maxPrice: '10' })
      .expect(400)

    expect(productsService.findAll).not.toHaveBeenCalled()
  })

  it('forwards parsed filters to the service', async () => {
    await request(app.getHttpServer())
      .get('/products')
      .query({
        category: 'Electronics,Tools',
        minPrice: '10',
        inStock: 'true',
        sortBy: 'updatedAt',
        sortDir: 'desc'
      })
      .expect(200)

    expect(productsService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        category: ['Electronics', 'Tools'],
        minPrice: 10,
        inStock: true,
        sortBy: 'updatedAt',
        sortDir: 'desc'
      })
    )
  })
})
