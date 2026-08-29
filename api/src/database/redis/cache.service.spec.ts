import { Logger } from '@nestjs/common'

import { CacheService } from './cache.service'

describe('CacheService', () => {
  let redis: {
    get: jest.Mock
    set: jest.Mock
    keys: jest.Mock
    del: jest.Mock
  }
  let cache: CacheService

  beforeEach(() => {
    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      keys: jest.fn().mockResolvedValue([]),
      del: jest.fn().mockResolvedValue(1)
    }
    cache = new CacheService(redis as never)
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => jest.restoreAllMocks())

  describe('the key', () => {
    it('treats the same query as the same entry regardless of parameter order', () => {
      const one = CacheService.buildKey('products:list', { page: 1, limit: 20 })
      const other = CacheService.buildKey('products:list', {
        limit: 20,
        page: 1
      })

      expect(one).toBe(other)
    })

    it('treats repeated search terms as a set, since they are unioned', () => {
      const one = CacheService.buildKey('products:list', { q: ['a', 'b'] })
      const other = CacheService.buildKey('products:list', { q: ['b', 'a'] })

      expect(one).toBe(other)
    })

    it('keeps different queries apart', () => {
      const page1 = CacheService.buildKey('products:list', { page: 1 })
      const page2 = CacheService.buildKey('products:list', { page: 2 })

      expect(page1).not.toBe(page2)
    })

    it('ignores absent parameters rather than encoding them', () => {
      const withUndefined = CacheService.buildKey('products:list', {
        page: 1,
        q: undefined,
        category: null
      })

      expect(withUndefined).toBe(
        CacheService.buildKey('products:list', { page: 1 })
      )
    })

    it('names the unfiltered query explicitly', () => {
      expect(CacheService.buildKey('products:list')).toBe('products:list:all')
    })
  })

  describe('reading and writing', () => {
    it('returns the parsed entry on a hit', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ data: [1, 2] }))

      await expect(cache.get('k')).resolves.toEqual({ data: [1, 2] })
    })

    it('returns nothing on a miss', async () => {
      await expect(cache.get('k')).resolves.toBeNull()
    })

    it('writes with a expiry, as a net for lost invalidations', async () => {
      await cache.set('k', { a: 1 })

      expect(redis.set).toHaveBeenCalledWith(
        'k',
        JSON.stringify({ a: 1 }),
        'EX',
        CacheService.DEFAULT_TTL_SECONDS
      )
    })
  })

  describe('when Redis is down', () => {
    it('reports a miss instead of propagating a read failure', async () => {
      redis.get.mockRejectedValue(new Error('connection refused'))

      await expect(cache.get('k')).resolves.toBeNull()
    })

    it('swallows a write failure, so the response is unaffected', async () => {
      redis.set.mockRejectedValue(new Error('connection refused'))

      await expect(cache.set('k', { a: 1 })).resolves.toBeUndefined()
    })

    it('swallows an invalidation failure', async () => {
      redis.keys.mockRejectedValue(new Error('connection refused'))

      await expect(cache.invalidatePrefix('products')).resolves.toBeUndefined()
    })

    it('logs the failure rather than hiding it entirely', async () => {
      const warned = jest.spyOn(Logger.prototype, 'warn')
      redis.get.mockRejectedValue(new Error('connection refused'))

      await cache.get('k')

      expect(warned).toHaveBeenCalled()
    })
  })

  describe('invalidation', () => {
    it('drops every entry under the prefix', async () => {
      redis.keys.mockResolvedValue([
        'products:list:page=1',
        'products:categories'
      ])

      await cache.invalidatePrefix('products')

      expect(redis.keys).toHaveBeenCalledWith('products:*')
      expect(redis.del).toHaveBeenCalledWith(
        'products:list:page=1',
        'products:categories'
      )
    })

    it('does nothing when there is nothing to drop', async () => {
      await cache.invalidatePrefix('products')

      expect(redis.del).not.toHaveBeenCalled()
    })
  })
})
