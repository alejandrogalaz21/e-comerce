import { resolveJwtSecret } from './app.configuration'

describe('resolveJwtSecret', () => {
  const silent = { warn: jest.fn() }

  beforeEach(() => silent.warn.mockClear())

  it('keeps a strong secret as it is', () => {
    const secret = 'a-perfectly-fine-signing-key'

    expect(resolveJwtSecret(secret, silent)).toBe(secret)
  })

  it.each(['changeme', 'CHANGEME', 'secret', 'password', 'short'])(
    'refuses to boot with %s',
    weak => {
      expect(() => resolveJwtSecret(weak, silent)).toThrow(/JWT_SECRET/)
    }
  )

  it('generates a secret when none is set, rather than signing with undefined', () => {
    const generated = resolveJwtSecret(undefined, silent)

    expect(generated).toHaveLength(96)
    expect(silent.warn).toHaveBeenCalled()
  })

  it('treats blank as unset', () => {
    expect(resolveJwtSecret('   ', silent)).toHaveLength(96)
  })

  it('never generates the same secret twice', () => {
    expect(resolveJwtSecret(undefined, silent)).not.toBe(
      resolveJwtSecret(undefined, silent)
    )
  })
})
