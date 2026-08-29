import { Module } from '@nestjs/common'

import { FakePaymentProvider } from './fake-payment.provider'
import { PAYMENT_PROVIDER } from './payment.interface'
import { MathRandomSource, RANDOM_SOURCE } from './random-source'

@Module({
  providers: [
    { provide: RANDOM_SOURCE, useClass: MathRandomSource },
    { provide: PAYMENT_PROVIDER, useClass: FakePaymentProvider }
  ],
  exports: [PAYMENT_PROVIDER]
})
export class PaymentModule {}
