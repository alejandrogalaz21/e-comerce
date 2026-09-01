import { Test, TestingModule } from '@nestjs/testing'

import { DECLINE_RATE, FakePaymentProvider } from './fake-payment.provider'
import { RANDOM_SOURCE, RandomSource } from './random-source'

describe('FakePaymentProvider', () => {
  let provider: FakePaymentProvider

  const random = { next: jest.fn() }

  const build = async (source: RandomSource) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FakePaymentProvider,
        { provide: RANDOM_SOURCE, useValue: source }
      ]
    }).compile()

    return module.get<FakePaymentProvider>(FakePaymentProvider)
  }

  const request = { amountInCents: 17998, idempotencyKey: 'a-b-c-d-e-f-g-h' }

  beforeEach(async () => {
    jest.clearAllMocks()
    provider = await build(random)
  })

  it('approves and returns a reference when the source is above the decline rate', async () => {
    random.next.mockReturnValue(DECLINE_RATE)

    const result = await provider.charge(request)

    expect(result.status).toBe('approved')
    expect(result).toHaveProperty('reference')
  })

  it('declines with a reason when the source is below the decline rate', async () => {
    random.next.mockReturnValue(DECLINE_RATE - 0.01)

    const result = await provider.charge(request)

    expect(result).toEqual({
      status: 'declined',
      reason: expect.any(String)
    })
  })

  it('is deterministic under a fixed source, so tests never depend on luck', async () => {
    random.next.mockReturnValue(0)

    const results = await Promise.all([
      provider.charge(request),
      provider.charge(request),
      provider.charge(request)
    ])

    expect(results.every(result => result.status === 'declined')).toBe(true)
  })

  it('declines roughly one in ten charges over a uniform distribution', async () => {
    let index = 0
    const sweeping = await build({ next: () => (index++ % 1000) / 1000 })

    const results = await Promise.all(
      Array.from({ length: 1000 }, () => sweeping.charge(request))
    )
    const declined = results.filter(
      result => result.status === 'declined'
    ).length

    expect(declined).toBe(Math.round(DECLINE_RATE * 1000))
  })
})
