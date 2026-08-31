import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import { AllExceptionsFilter } from '@/common/filters/http-exception.filter'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'

async function main() {
  process.env.APP_STARTED_AT = String(Date.now())
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const prefix = 'api/v1'
  const appName = process.env.APP_NAME || 'E-commerce API'
  const apiVersion = process.env.APP_VERSION ?? '1.0.0'

  const config = app.get(ConfigService)

  app.setGlobalPrefix(prefix)

  // Rate limiting counts by client IP. Behind a reverse proxy every request
  // carries the proxy's address, so without this one counter would be shared by
  // the whole internet. The hop count must match the real deployment: trusting
  // the entire chain would let a client forge X-Forwarded-For and mint itself a
  // fresh counter on every request.
  const trustProxyHops = config.get<number>('app.trustProxyHops') ?? 0
  if (trustProxyHops > 0) app.set('trust proxy', trustProxyHops)

  // Swagger serves its own inline scripts and styles, so the default CSP would
  // break the docs page. Everything else stays on.
  app.use(helmet({ contentSecurityPolicy: false }))

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

  app.useGlobalFilters(new AllExceptionsFilter())

  app.enableCors({
    origin: config.get<string[]>('app.corsOrigins'),
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
