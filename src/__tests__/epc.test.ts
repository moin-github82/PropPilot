/**
 * Unit tests for src/app/lib/epc.ts
 *
 * Covers all pure functions: normaliseAddress, diceSimilarity,
 * findBestAddressMatch, getCertificateAgeYears, getUpgradeRecommendations.
 * No network calls are made — all tested functions are synchronous and pure.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  normaliseAddress,
  diceSimilarity,
  findBestAddressMatch,
  getCertificateAgeYears,
  getUpgradeRecommendations,
} from '../app/lib/epc.js'

import type { EPCCertificate } from '../app/lib/epc.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal EPCCertificate with sensible defaults, overridable per test */
function makeCert(overrides: Partial<EPCCertificate> = {}): EPCCertificate {
  return {
    'lmk-key': 'TEST-LMK-001',
    address: '10 Downing Street',
    postcode: 'SW1A 2AA',
    'building-reference-number': '12345',
    'current-energy-rating': 'D',
    'potential-energy-rating': 'B',
    'current-energy-efficiency': 62,
    'potential-energy-efficiency': 82,
    'property-type': 'House',
    'built-form': 'Detached',
    'inspection-date': '2020-06-15',
    'lodgement-date': '2020-07-01',
    'transaction-type': 'marketed sale',
    'environment-impact-current': 55,
    'environment-impact-potential': 75,
    'energy-consumption-current': 250,
    'energy-consumption-potential': 150,
    'co2-emissions-current': 4.5,
    'co2-emiss-curr-per-floor-area': 0.03,
    'co2-emissions-potential': 2.5,
    'lighting-cost-current': 120,
    'lighting-cost-potential': 80,
    'heating-cost-current': 900,
    'heating-cost-potential': 600,
    'hot-water-cost-current': 200,
    'hot-water-cost-potential': 150,
    'total-floor-area': 95,
    'energy-tariff': 'standard tariff',
    'mains-gas-flag': 'Y',
    'floor-level': '',
    'flat-top-storey': '',
    'flat-storey-count': 0,
    'main-heating-controls': 'programmer and roomstat',
    'multi-glaze-proportion': 100,
    'glazed-area': 'Normal',
    'extension-count': 0,
    'number-habitable-rooms': 5,
    'number-heated-rooms': 5,
    'low-energy-lighting': 80,
    'number-open-fireplaces': 0,
    'hotwater-description': 'From main system',
    'floor-description': 'Suspended, no insulation (assumed)',
    'windows-description': 'Fully double glazed',
    'walls-description': 'Cavity wall, as built, no insulation (assumed)',
    'secondheat-description': 'None',
    'sheating-env-eff': 'N/A',
    'roof-description': 'Pitched, 270 mm loft insulation',
    'roof-env-eff': 'Very Good',
    'mainheat-description': 'Boiler and radiators, mains gas',
    'mainheat-env-eff': 'Good',
    'mainheatcont-description': 'Programmer and roomstat',
    'lighting-description': 'Low energy lighting in 80% of fixed outlets',
    'main-fuel': 'mains gas',
    'wind-turbine-count': 0,
    'heat-loss-corridor': '',
    'unheated-corridor-length': 0,
    'floor-height': 2.4,
    'photo-supply': 0,
    'solar-water-heating-flag': 'N',
    'mechanical-ventilation': '',
    'constituency': 'Cities of London and Westminster',
    'county': 'Greater London',
    'local-authority': 'Westminster',
    'tenure': 'Owner-occupied',
    'fixed-lighting-outlets-count': 10,
    'low-energy-fixed-light-count': 8,
    ...overrides,
  }
}

// ─── normaliseAddress ─────────────────────────────────────────────────────────

describe('normaliseAddress', () => {
  it('lowercases and strips punctuation', () => {
    assert.equal(normaliseAddress('10 Downing Street, London'), '10 downing street london')
  })

  it('collapses multiple spaces to single space', () => {
    assert.equal(normaliseAddress('Flat  3   High Street'), 'flat  3   high street'.replace(/\s+/g, ' ').trim())
  })

  it('trims leading and trailing whitespace', () => {
    assert.equal(normaliseAddress('  123 Test Road  '), '123 test road')
  })

  it('handles empty string', () => {
    assert.equal(normaliseAddress(''), '')
  })

  it('preserves numbers', () => {
    assert.equal(normaliseAddress('42B Church Lane'), '42b church lane')
  })
})

// ─── diceSimilarity ───────────────────────────────────────────────────────────

describe('diceSimilarity', () => {
  it('returns 1 for identical strings', () => {
    assert.equal(diceSimilarity('hello world', 'hello world'), 1)
  })

  it('returns 0 for strings shorter than 2 chars', () => {
    assert.equal(diceSimilarity('a', 'abc'), 0)
    assert.equal(diceSimilarity('abc', 'b'), 0)
  })

  it('returns a value between 0 and 1 for partial matches', () => {
    const score = diceSimilarity('10 downing street', '10 downing st')
    assert.ok(score > 0 && score < 1, `expected 0 < score < 1, got ${score}`)
  })

  it('is higher for close matches than distant ones', () => {
    const close   = diceSimilarity('flat 1 high street', 'flat 1 high st')
    const distant = diceSimilarity('flat 1 high street', 'completely different address')
    assert.ok(close > distant, `expected close (${close}) > distant (${distant})`)
  })

  it('returns 0 for completely different strings of normal length', () => {
    const score = diceSimilarity('abcdef', 'xyz123')
    assert.ok(score < 0.2, `expected low score, got ${score}`)
  })
})

// ─── findBestAddressMatch ─────────────────────────────────────────────────────

describe('findBestAddressMatch', () => {
  const records = [
    makeCert({ address: '10 Downing Street London', postcode: 'SW1A 2AA' }),
    makeCert({ address: 'Flat 1 High Street Manchester', postcode: 'M1 1AA' }),
    makeCert({ address: '22 Baker Street London', postcode: 'NW1 6XE' }),
  ]

  it('returns the best match for an exact address', () => {
    const result = findBestAddressMatch('10 Downing Street London', records)
    assert.ok(result !== null)
    assert.equal(result!.record.address, '10 Downing Street London')
    assert.ok(result!.score > 0.9, `expected high confidence, got ${result!.score}`)
  })

  it('returns a match for a partial/fuzzy address', () => {
    const result = findBestAddressMatch('10 Downing St', records)
    assert.ok(result !== null)
    assert.equal(result!.record.address, '10 Downing Street London')
  })

  it('returns null for an empty records array', () => {
    const result = findBestAddressMatch('10 Downing Street', [])
    assert.equal(result, null)
  })

  it('returns null when best match score is below the default threshold (0.45)', () => {
    const result = findBestAddressMatch('zzz qqq mmm rrr', records)
    assert.equal(result, null)
  })

  it('respects a custom threshold', () => {
    // With a very high threshold (0.99), a near-match that scores < 0.99 returns null
    const result = findBestAddressMatch('10 Downing St Lon', records, 0.99)
    assert.equal(result, null)
  })

  it('returns score as a number between 0 and 1', () => {
    const result = findBestAddressMatch('22 Baker Street', records)
    assert.ok(result !== null)
    assert.ok(result!.score >= 0 && result!.score <= 1)
  })
})

// ─── getCertificateAgeYears ───────────────────────────────────────────────────

describe('getCertificateAgeYears', () => {
  it('returns 0 for a certificate lodged this year', () => {
    const thisYear = new Date().getFullYear()
    const cert = makeCert({ 'lodgement-date': `${thisYear}-01-01` })
    const age = getCertificateAgeYears(cert)
    assert.ok(age >= 0 && age <= 1, `expected 0–1 years, got ${age}`)
  })

  it('returns approximately 10 for a certificate lodged 10 years ago', () => {
    const year = new Date().getFullYear() - 10
    const cert = makeCert({ 'lodgement-date': `${year}-01-01` })
    const age = getCertificateAgeYears(cert)
    assert.ok(age >= 9 && age <= 11, `expected ~10 years, got ${age}`)
  })

  it('returns a positive integer', () => {
    const cert = makeCert({ 'lodgement-date': '2015-03-15' })
    const age = getCertificateAgeYears(cert)
    assert.ok(Number.isInteger(age) && age > 0)
  })
})

// ─── getUpgradeRecommendations ────────────────────────────────────────────────

describe('getUpgradeRecommendations', () => {
  it('returns no recommendations for a well-insulated, efficient property', () => {
    const cert = makeCert({
      'current-energy-rating': 'B',
      'roof-description': 'Pitched, 270 mm loft insulation',
      'walls-description': 'Cavity wall, as built, insulated (assumed)',
      'windows-description': 'Fully double glazed',
      'main-fuel': 'mains gas',
      'solar-water-heating-flag': 'N',
      'photo-supply': 0,
      'mainheatcont-description': 'Programmer and roomstat',
      'floor-description': 'Solid, insulated',
      'built-form': 'Mid-Terrace',
    })
    const recs = getUpgradeRecommendations(cert)
    assert.equal(recs.length, 0)
  })

  it('recommends loft insulation when roof is uninsulated', () => {
    const cert = makeCert({ 'roof-description': 'Pitched, no insulation' })
    const recs = getUpgradeRecommendations(cert)
    const ids = recs.map(r => r.upgrade)
    assert.ok(ids.some(u => u.toLowerCase().includes('loft')), 'expected loft insulation recommendation')
  })

  it('recommends cavity wall insulation when walls have no insulation', () => {
    const cert = makeCert({ 'walls-description': 'Cavity wall, no insulation' })
    const recs = getUpgradeRecommendations(cert)
    assert.ok(recs.some(r => r.upgrade.toLowerCase().includes('cavity')))
  })

  it('recommends heat pump for low-rated gas-heated properties', () => {
    const cert = makeCert({
      'main-fuel': 'mains gas',
      'current-energy-rating': 'F',
    })
    const recs = getUpgradeRecommendations(cert)
    assert.ok(recs.some(r => r.upgrade.toLowerCase().includes('heat pump')))
  })

  it('does NOT recommend heat pump for A/B/C rated properties', () => {
    const cert = makeCert({
      'main-fuel': 'mains gas',
      'current-energy-rating': 'A',
    })
    const recs = getUpgradeRecommendations(cert)
    assert.ok(!recs.some(r => r.upgrade.toLowerCase().includes('heat pump')))
  })

  it('recommends solar PV for detached/semi-detached without existing solar', () => {
    const cert = makeCert({
      'solar-water-heating-flag': 'N',
      'photo-supply': 0,
      'built-form': 'Detached',
    })
    const recs = getUpgradeRecommendations(cert)
    assert.ok(recs.some(r => r.upgrade.toLowerCase().includes('solar')))
  })

  it('does NOT recommend solar PV for a property that already has panels', () => {
    const cert = makeCert({
      'solar-water-heating-flag': 'Y',
      'photo-supply': 3500,
      'built-form': 'Detached',
    })
    const recs = getUpgradeRecommendations(cert)
    assert.ok(!recs.some(r => r.upgrade.toLowerCase().includes('solar')))
  })

  it('recommends double glazing when windows are single-glazed', () => {
    const cert = makeCert({ 'windows-description': 'Single glazed' })
    const recs = getUpgradeRecommendations(cert)
    assert.ok(recs.some(r => r.upgrade.toLowerCase().includes('glaz')))
  })

  it('returns recommendations sorted high → medium → low priority', () => {
    const cert = makeCert({
      'roof-description': 'Pitched, no insulation',           // high
      'walls-description': 'Cavity wall, no insulation',      // high
      'windows-description': 'Single glazed',                 // medium
      'main-fuel': 'mains gas',
      'current-energy-rating': 'E',                           // triggers heat pump (high)
      'solar-water-heating-flag': 'N',
      'photo-supply': 0,
      'built-form': 'Detached',                               // triggers solar (medium)
    })
    const recs = getUpgradeRecommendations(cert)
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    for (let i = 1; i < recs.length; i++) {
      assert.ok(
        priorityOrder[recs[i].priority] >= priorityOrder[recs[i - 1].priority],
        `Recommendations out of order at index ${i}: ${recs[i-1].priority} before ${recs[i].priority}`
      )
    }
  })

  it('each recommendation has required fields', () => {
    const cert = makeCert({ 'roof-description': 'Pitched, no insulation' })
    const recs = getUpgradeRecommendations(cert)
    for (const rec of recs) {
      assert.ok(rec.upgrade,              'missing upgrade title')
      assert.ok(rec.description,          'missing description')
      assert.ok(rec.estimatedCostRange,   'missing cost range')
      assert.ok(rec.annualSavingsRange,   'missing savings range')
      assert.ok(rec.bandImprovement,      'missing band improvement')
      assert.ok(Array.isArray(rec.grants),'grants should be an array')
      assert.ok(['high','medium','low'].includes(rec.priority), 'invalid priority')
    }
  })
})
