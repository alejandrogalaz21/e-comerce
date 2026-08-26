import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function main() {
  process.env.APP_STARTED_AT = String(Date.now())
  const app = await NestFactory.create(AppModule)
  const prefix = 'api/v1'
  const appName = process.env.APP_NAME || 'Project Nest API'
  const apiVersion = process.env.APP_VERSION ?? '1.0.0'

  app.setGlobalPrefix(prefix)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true
      }
    })
  )

  app.enableCors({
    origin: '*',
    credentials: false
  })

  const swaggerConfig = new DocumentBuilder()
    .setTitle(appName)
    .setDescription('REST API documentation')
    .setVersion(apiVersion)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Provide the JWT issued by the sign-in endpoint'
      },
      'jwt'
    )
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup(`${prefix}/docs`, app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: `${appName} | API Docs`
  })

  const port = process.env.PORT || 8080
  await app.listen(port)

  console.log(`Nest API : ${appName}`)
  console.log(`App started at: ${process.env.APP_STARTED_AT}`)
  console.log(`api it's runnung on: http://localhost:${port}/${prefix}`)
}
main()
