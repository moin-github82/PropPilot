/**
 * Unit tests for src/app/lib/landRegistry.ts
 *
 * Covers all exported pure helpers:
 *   normalisePostcode, formatPostcodeForQuery, postcodeToHPIRegion
 *   PROPERTY_TYPE_MAP, TENURE_MAP
 *
 * Network-dependent functions (getPricePaidByPostcode, getPropertyValuation, etc.)
 * are not tested here — they belong in integration tests with a mocked HTTP layer.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  normalisePostcode,
  formatPostcodeForQuery,
  postcodeToHPIRegion,
  PROPERTY_TYPE_MAP,
  TENURE_MAP,
} from '../app/lib/landRegistry.js'

// ─── normalisePostcode ────────────────────────────────────────────────────────

describe('normalisePostcode', () => {
  it('removes spaces and uppercases', () => {
    assert.equal(normalisePostcode('sw1a 2aa'), 'SW1A2AA')
  })

  it('handles already-clean postcode', () => {
    assert.equal(normalisePostcode('EC1A1BB'), 'EC1A1BB')
  })

  it('removes multiple spaces', () => {
    assert.equal(normalisePostcode('M 1  1 AE'), 'M11AE')
  })

  it('handles lowercase input', () => {
    assert.equal(normalisePostcode('e1 7jb'), 'E17JB')
  })
})

// ─── formatPostcodeForQuery ───────────────────────────────────────────────────

describe('formatPostcodeForQuery', () => {
  it('formats a spaced postcode correctly', () => {
    assert.equal(formatPostcodeForQuery('SW1A 2AA'), 'SW1A 2AA')
  })

  it('formats a non-spaced postcode (reinserts space before last 3 chars)', () => {
    assert.equal(formatPostcodeForQuery('SW1A2AA'), 'SW1A 2AA')
  })

  it('handles short postcodes like M1 1AE', () => {
    assert.equal(formatPostcodeForQuery('M1 1AE'), 'M1 1AE')
  })

  it('handles lowercase input by uppercasing', () => {
    assert.equal(formatPostcodeForQuery('ec1a 1bb'), 'EC1A 1BB')
  })

  it('always produces exactly one space separating outcode and incode', () => {
    const result = formatPostcodeForQuery('B11AA')
    const parts  = result.split(' ')
    assert.equal(parts.length, 2,          'should have exactly two parts separated by space')
    assert.equal(parts[1].length, 3,       'incode should be 3 chars')
  })
})

// ─── postcodeToHPIRegion ──────────────────────────────────────────────────────

describe('postcodeToHPIRegion', () => {
  // London (E12000007)
  const londonCases = [
    ['EC1A 1BB', 'City of London'],
    ['WC2N 5DU', 'West Central London'],
    ['E1 7JB',   'East London'],
    ['N1 9GU',   'North London'],
    ['NW1 6XE',  'North West London'],
    ['SE1 7PB',  'South East London'],
    ['SW1A 2AA', 'South West London'],
    ['W1A 1AA',  'West London'],
    ['BR1 1LU',  'Bromley'],
    ['CR0 1EA',  'Croydon'],
    ['DA1 1AA',  'Dartford / London fringe'],
    ['EN1 1AA',  'Enfield'],
    ['HA1 1AA',  'Harrow'],
    ['IG1 1AA',  'Ilford'],
    ['KT1 1AA',  'Kingston'],
    ['RM1 1AA',  'Romford'],
    ['SM1 1AA',  'Sutton'],
    ['TW1 1AA',  'Twickenham'],
    ['UB1 1AA',  'Uxbridge'],
    ['WD1 1AA',  'Watford'],
  ]

  for (const [postcode, label] of londonCases) {
    it(`maps ${postcode} (${label}) → London E12000007`, () => {
      assert.equal(postcodeToHPIRegion(postcode), 'E12000007')
    })
  }

  // Greater Manchester (E12000002)
  const manchesterCases = [
    ['M1 1AE',   'Manchester'],
    ['SK1 1AA',  'Stockport'],
    ['OL1 1AA',  'Oldham'],
    ['BL1 1AA',  'Bolton'],
    ['WN1 1AA',  'Wigan'],
  ]

  for (const [postcode, label] of manchesterCases) {
    it(`maps ${postcode} (${label}) → Greater Manchester E12000002`, () => {
      assert.equal(postcodeToHPIRegion(postcode), 'E12000002')
    })
  }

  // Yorkshire (E12000003)
  const yorkshireCases = [
    ['LS1 1AA', 'Leeds'],
    ['BD1 1AA', 'Bradford'],
    ['HX1 1AA', 'Halifax'],
    ['HD1 1AA', 'Huddersfield'],
    ['WF1 1AA', 'Wakefield'],
    ['YO1 1AA', 'York'],
    ['DN1 1AA', 'Doncaster'],
  ]

  for (const [postcode, label] of yorkshireCases) {
    it(`maps ${postcode} (${label}) → Yorkshire E12000003`, () => {
      assert.equal(postcodeToHPIRegion(postcode), 'E12000003')
    })
  }

  // West Midlands (E12000005)
  const wmCases = [
    ['B1 1AA',  'Birmingham'],
    ['CV1 1AA', 'Coventry'],
    ['WV1 1AA', 'Wolverhampton'],
    ['WS1 1AA', 'Walsall'],
    ['DY1 1AA', 'Dudley'],
  ]

  for (const [postcode, label] of wmCases) {
    it(`maps ${postcode} (${label}) → West Midlands E12000005`, () => {
      assert.equal(postcodeToHPIRegion(postcode), 'E12000005')
    })
  }

  // South West (E12000009)
  const swCases = [
    ['BS1 1AA', 'Bristol'],
    ['BA1 1AA', 'Bath'],
    ['GL1 1AA', 'Gloucester'],
    ['OX1 1AA', 'Oxford'],
  ]

  for (const [postcode, label] of swCases) {
    it(`maps ${postcode} (${label}) → South West E12000009`, () => {
      assert.equal(postcodeToHPIRegion(postcode), 'E12000009')
    })
  }

  // South East (E12000008)
  const seCases = [
    ['BN1 1AA', 'Brighton'],
    ['TN1 1AA', 'Tunbridge Wells'],
    ['ME1 1AA', 'Medway'],
    ['CT1 1AA', 'Canterbury'],
    ['PO1 1AA', 'Portsmouth'],
    ['SO14 1AA', 'Southampton'],
    ['GU1 1AA', 'Guildford'],
  ]

  for (const [postcode, label] of seCases) {
    it(`maps ${postcode} (${label}) → South East E12000008`, () => {
      assert.equal(postcodeToHPIRegion(postcode), 'E12000008')
    })
  }

  // National fallback (E92000001) — areas not explicitly mapped
  it('returns national code E92000001 for Edinburgh EH postcode', () => {
    assert.equal(postcodeToHPIRegion('EH1 1AA'), 'E92000001')
  })

  it('returns national code E92000001 for Cardiff CF postcode', () => {
    assert.equal(postcodeToHPIRegion('CF10 1AA'), 'E92000001')
  })

  it('returns national code E92000001 for Newcastle NE postcode', () => {
    assert.equal(postcodeToHPIRegion('NE1 1AA'), 'E92000001')
  })

  it('is case-insensitive (lowercase input)', () => {
    const upper = postcodeToHPIRegion('SW1A 2AA')
    const lower = postcodeToHPIRegion('sw1a 2aa')
    assert.equal(upper, lower)
  })
})

// ─── PROPERTY_TYPE_MAP ────────────────────────────────────────────────────────

describe('PROPERTY_TYPE_MAP', () => {
  it('maps D → Detached', ()          => assert.equal(PROPERTY_TYPE_MAP['D'], 'Detached'))
  it('maps S → Semi-Detached', ()     => assert.equal(PROPERTY_TYPE_MAP['S'], 'Semi-Detached'))
  it('maps T → Terraced', ()          => assert.equal(PROPERTY_TYPE_MAP['T'], 'Terraced'))
  it('maps F → Flat / Maisonette', () => assert.equal(PROPERTY_TYPE_MAP['F'], 'Flat / Maisonette'))
})

// ─── TENURE_MAP ───────────────────────────────────────────────────────────────

describe('TENURE_MAP', () => {
  it('maps F → Freehold',  () => assert.equal(TENURE_MAP['F'], 'Freehold'))
  it('maps L → Leasehold', () => assert.equal(TENURE_MAP['L'], 'Leasehold'))
})
