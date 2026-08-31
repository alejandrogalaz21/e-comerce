import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

import { MAX_PAGE_SIZE, PaginationDTO } from './pagination.dto'

async function messagesFor(query: Record<string, unknown>): Promise<string> {
  const dto = plainToInstance(PaginationDTO, query, {
    enableImplicitConversion: true
  })
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true
  })

  return errors
    .flatMap(error => Object.values(error.constraints ?? {}))
    .join(' ')
}

describe('PaginationDTO', () => {
  it('accepts a normal page and limit', async () => {
    expect(await messagesFor({ page: '2', limit: '25' })).toBe('')
  })

  it('rejects a negative page, which reached Postgres as a negative OFFSET', async () => {
    expect(await messagesFor({ page: '-1' })).toContain('page')
  })

  it('rejects page zero', async () => {
    expect(await messagesFor({ page: '0' })).toContain('page')
  })

  it('rejects a fractional page', async () => {
    expect(await messagesFor({ page: '1.5' })).toContain('page')
  })

  it('caps the page size instead of letting one request ask for the whole table', async () => {
    expect(await messagesFor({ limit: String(MAX_PAGE_SIZE + 1) })).toContain(
      'limit'
    )
  })

  it('accepts the ceiling itself', async () => {
    expect(await messagesFor({ limit: String(MAX_PAGE_SIZE) })).toBe('')
  })

  it('leaves both undefined when not requested', async () => {
    const dto = plainToInstance(PaginationDTO, {})

    expect(dto.page).toBeUndefined()
    expect(dto.limit).toBeUndefined()
  })
})
