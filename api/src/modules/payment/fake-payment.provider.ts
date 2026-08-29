import { Inject, Injectable } from '@nestjs/common'

import {
  ChargeRequest,
  ChargeResult,
  PaymentProvider
} from './payment.interface'
import { RANDOM_SOURCE, RandomSource } from './random-source'

export const DECLINE_RATE = 0.1

@Injectable()
export class FakePaymentProvider implements PaymentProvider {
  constructor(
    @Inject(RANDOM_SOURCE) private readonly random: RandomSource
  ) {}

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    if (this.random.next() < DECLINE_RATE) {
      return { status: 'declined', reason: 'card declined by the issuer' }
    }

    return {
      status: 'approved',
      reference: `fake_ch_${request.idempotencyKey.replace(/-/g, '').slice(0, 24)}`
    }
  }
}
