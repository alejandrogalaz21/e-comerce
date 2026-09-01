import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

import { CreateOrderDto } from './create-order.dto'

const VALID_KEY = '3f7b1c92-5d2e-4c8a-b1f0-6a9e2d4c8b31'

const ADDRESS = {
  name: 'Ada Lovelace',
  phone: '+14155552671',
  email: 'ada@example.com',
  address: '1 Test Street',
  city: 'Springfield',
  state: 'IL',
  zipCode: '62701',
  country: 'United States'
}

function build(overrides: Record<string, unknown> = {}): CreateOrderDto {
  return plainToInstance(CreateOrderDto, {
    items: [{ productId: '0d6cd087-3f2e-4f30-b0aa-cf9c93b1c0d5', quantity: 1 }],
    idempotencyKey: VALID_KEY,
    shippingAddress: ADDRESS,
    ...overrides
  })
}

async function messagesFor(
  overrides: Record<string, unknown> = {}
): Promise<string> {
  const errors = await validate(build(overrides), {
    whitelist: true,
    forbidNonWhitelisted: true
  })

  return JSON.stringify(errors)
}

describe('CreateOrderDto', () => {
  describe('idempotencyKey', () => {
    it('accepts the UUID the checkout mints', async () => {
      expect(await messagesFor()).toBe('[]')
    })

    it('rejects a guessable key: replaying one returns the shipping address', async () => {
      expect(await messagesFor({ idempotencyKey: 'order-42' })).toContain(
        'idempotencyKey'
      )
    })

    it('rejects a sequential key even at the old eight-character minimum', async () => {
      expect(await messagesFor({ idempotencyKey: 'order-00000042' })).toContain(
        'idempotencyKey'
      )
    })
  })

  describe('shippingAddress', () => {
    it('trims every field before it is stored', () => {
      const dto = build({
        shippingAddress: { ...ADDRESS, name: '  Ada Lovelace  ' }
      })

      expect(dto.shippingAddress.name).toBe('Ada Lovelace')
    })

    it.each([
      ['name', '<script>alert(1)</script>'],
      ['address', '1 Test <b>Street</b>'],
      ['city', '<img src=x onerror=alert(1)>']
    ])(
      'rejects HTML in %s, like the product fields do',
      async (field, value) => {
        const messages = await messagesFor({
          shippingAddress: { ...ADDRESS, [field]: value }
        })

        expect(messages).toContain('HTML markup is not allowed')
      }
    )

    it('still refuses an address that is only whitespace', async () => {
      expect(
        await messagesFor({ shippingAddress: { ...ADDRESS, city: '   ' } })
      ).toContain('city')
    })
  })

  describe('contact email', () => {
    it('refuses a delivery with no email to write to', async () => {
      const { email, ...withoutEmail } = ADDRESS

      expect(
        await messagesFor({ shippingAddress: withoutEmail })
      ).toContain('email')
    })

    it.each(['ada', 'ada@', '@example.com', 'ada example.com'])(
      'refuses %s, which nobody can be reached at',
      async value => {
        expect(
          await messagesFor({ shippingAddress: { ...ADDRESS, email: value } })
        ).toContain('email')
      }
    )

    it('trims the address before storing it', () => {
      const dto = build({
        shippingAddress: { ...ADDRESS, email: '  ada@example.com  ' }
      })

      expect(dto.shippingAddress.email).toBe('ada@example.com')
    })
  })
})
