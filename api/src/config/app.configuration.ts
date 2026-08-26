// src/config/app.configuration.ts
import { registerAs } from '@nestjs/config'

export default registerAs('app', () => ({
  name: process.env.APP_NAME || 'ecommerce-api',
  version: process.env.APP_VERSION || '0.1.0',
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
  jwtSecret: process.env.JWT_SECRET
}))
