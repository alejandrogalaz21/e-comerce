// src/database/seed/seed.service.ts
import { Injectable } from '@nestjs/common'

@Injectable()
export class SeedService {
  constructor() {}

  populateDB() {
    return 'Seed executed'
  }
}
