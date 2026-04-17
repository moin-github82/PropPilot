/**
 * Redis caching layer — Upstash + local Redis compatible
 *
 * Upstash requires TLS (rediss://) and specific connection options.
 * If Redis is unavailable for any reason, all operations silently
 * fall through and the app continues without caching.
 */

import Redis from 'ioredis'

let redisClient: Redis | null = null
let redisUnavailable = false

function getRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl || redisUrl.trim() === '') return null
  if (redisUnavailable) return null
  if (redisClient) return redisClient

  const isTLS = redisUrl.startsWith('rediss://')

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 0,       // fail fast — don't hang requests
      enableOfflineQueue: false,     // don't queue commands when disconnected
      connectTimeout: 5000,          // 5s connect timeout
      commandTimeout: 3000,          // 3s per command
      lazyConnect: true,
      ...(isTLS
        ? {
            tls: {
              rejectUnauthorized: false, // required for Upstash
            },
          }
        : {}),
    })

    redisClient.on('error', (err: Error) => {
      // Only warn once — not on every failed command
      if (!redisUnavailable) {
        console.warn('[Cache] Redis unavailable — running without cache:', err.message)
      }
      redisUnavailable = true
      redisClient?.disconnect()
      redisClient = null
    })

    redisClient.on('connect', () => {
      console.log('[Cache] Redis connected ✓')
      redisUnavailable = false
    })

  } catch (err) {
    console.warn('[Cache] Failed to initialise Redis:', err)
    redisUnavailable = true
    return null
  }

  return redisClient
}

// ─── TTL constants (seconds) ──────────────────────────────────────────────────

export const TTL = {
  EPC_POSTCODE:    7  * 24 * 60 * 60,
  EPC_CERTIFICATE: 30 * 24 * 60 * 60,
  LAND_REGISTRY:   24 *      60 * 60,
  HPI:             12 *      60 * 60,
  VALUATION:       24 *      60 * 60,
} as const

// ─── Key builders ─────────────────────────────────────────────────────────────

export const CacheKey = {
  epcPostcode:    (p: string) => `epc:pc:${p.replace(/\s/g, '').toUpperCase()}`,
  epcCertificate: (k: string) => `epc:cert:${k}`,
  pricePaid:      (p: string) => `lr:pp:${p.replace(/\s/g, '').toUpperCase()}`,
  hpi:            (r: string) => `lr:hpi:${r}`,
  valuation:      (p: string, paon: string) =>
    `lr:val:${p.replace(/\s/g, '').toUpperCase()}:${paon.toLowerCase().replace(/\s/g, '_')}`,
}

// ─── Core operations ──────────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient()
    if (!client) return null
    const raw = await client.get(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    const client = getRedisClient()
    if (!client) return
    await client.setex(key, ttlSeconds, JSON.stringify(value))
  } catch {
    // non-fatal
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const client = getRedisClient()
    if (!client) return
    await client.del(key)
  } catch {}
}

/**
 * Cache-aside: check cache first, call fetcher on miss, store result.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet<T>(key)
  if (cached !== null) return cached
  const fresh = await fetcher()
  await cacheSet(key, fresh, ttlSeconds)
  return fresh
}
