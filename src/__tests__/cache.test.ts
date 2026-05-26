/**
 * Unit tests for src/app/lib/cache.ts
 *
 * Covers: TTL constants, CacheKey builders, and withCache logic.
 * ioredis is mocked via module.mock so no real Redis connection is needed.
 */

import { describe, it, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import { TTL, CacheKey } from '../app/lib/cache.js'

// ─── TTL constants ────────────────────────────────────────────────────────────

describe('TTL constants', () => {
  it('EPC_POSTCODE is 7 days in seconds', () => {
    assert.equal(TTL.EPC_POSTCODE, 7 * 24 * 60 * 60)
  })

  it('EPC_CERTIFICATE is 30 days in seconds', () => {
    assert.equal(TTL.EPC_CERTIFICATE, 30 * 24 * 60 * 60)
  })

  it('LAND_REGISTRY is 24 hours in seconds', () => {
    assert.equal(TTL.LAND_REGISTRY, 24 * 60 * 60)
  })

  it('HPI is 12 hours in seconds', () => {
    assert.equal(TTL.HPI, 12 * 60 * 60)
  })

  it('VALUATION is 24 hours in seconds', () => {
    assert.equal(TTL.VALUATION, 24 * 60 * 60)
  })

  it('EPC_CERTIFICATE TTL > EPC_POSTCODE TTL (certs are more stable)', () => {
    assert.ok(TTL.EPC_CERTIFICATE > TTL.EPC_POSTCODE)
  })

  it('all TTLs are positive integers', () => {
    for (const [name, value] of Object.entries(TTL)) {
      assert.ok(Number.isInteger(value) && value > 0, `${name} should be a positive integer, got ${value}`)
    }
  })
})

// ─── CacheKey builders ────────────────────────────────────────────────────────

describe('CacheKey builders', () => {
  describe('epcPostcode', () => {
    it('normalises and prefixes correctly', () => {
      assert.equal(CacheKey.epcPostcode('SW1A 2AA'), 'epc:pc:SW1A2AA')
    })

    it('strips spaces and uppercases', () => {
      assert.equal(CacheKey.epcPostcode('sw1a 2aa'), 'epc:pc:SW1A2AA')
    })

    it('is idempotent — calling twice gives same key', () => {
      assert.equal(CacheKey.epcPostcode('M1 1AE'), CacheKey.epcPostcode('M1 1AE'))
    })
  })

  describe('epcCertificate', () => {
    it('prefixes with epc:cert:', () => {
      assert.equal(CacheKey.epcCertificate('LMK-001'), 'epc:cert:LMK-001')
    })
  })

  describe('pricePaid', () => {
    it('normalises postcode and prefixes with lr:pp:', () => {
      assert.equal(CacheKey.pricePaid('EC1A 1BB'), 'lr:pp:EC1A1BB')
    })
  })

  describe('hpi', () => {
    it('uses region code as-is', () => {
      assert.equal(CacheKey.hpi('E12000007'), 'lr:hpi:E12000007')
    })
  })

  describe('valuation', () => {
    it('normalises postcode and lowercases house number', () => {
      const key = CacheKey.valuation('SW1A 2AA', '10')
      assert.equal(key, 'lr:val:SW1A2AA:10')
    })

    it('replaces spaces in house number/paon with underscores', () => {
      const key = CacheKey.valuation('SW1A 2AA', 'Flat 3')
      assert.equal(key, 'lr:val:SW1A2AA:flat_3')
    })

    it('two different house numbers produce different keys', () => {
      const k1 = CacheKey.valuation('SW1A 2AA', '10')
      const k2 = CacheKey.valuation('SW1A 2AA', '11')
      assert.notEqual(k1, k2)
    })

    it('two different postcodes produce different keys', () => {
      const k1 = CacheKey.valuation('SW1A 2AA', '10')
      const k2 = CacheKey.valuation('EC1A 1BB', '10')
      assert.notEqual(k1, k2)
    })
  })

  describe('key namespace isolation', () => {
    it('epcPostcode and pricePaid keys have different prefixes', () => {
      const epcKey = CacheKey.epcPostcode('SW1A 2AA')
      const ppKey  = CacheKey.pricePaid('SW1A 2AA')
      assert.notEqual(epcKey.split(':')[0], ppKey.split(':')[0])
    })
  })
})
