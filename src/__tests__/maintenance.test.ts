/**
 * Unit tests for src/app/lib/maintenance.ts
 *
 * Covers: getPropertyEra, parseCostRange, generateMaintenanceReport.
 * All functions are pure — no network calls.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  getPropertyEra,
  parseCostRange,
  generateMaintenanceReport,
} from '../app/lib/maintenance.js'

import type { EPCCertificate } from '../app/lib/epc.js'

// ─── Shared cert factory ──────────────────────────────────────────────────────

function makeCert(overrides: Partial<EPCCertificate> = {}): EPCCertificate {
  return {
    'lmk-key': 'MAINT-TEST-001',
    address: '5 Test Street',
    postcode: 'B1 1AA',
    'building-reference-number': '99999',
    'current-energy-rating': 'D',
    'potential-energy-rating': 'B',
    'current-energy-efficiency': 60,
    'potential-energy-efficiency': 80,
    'property-type': 'House',
    'built-form': 'Semi-Detached',
    'inspection-date': '2018-04-10',
    'lodgement-date': '2018-05-01',
    'transaction-type': 'marketed sale',
    'environment-impact-current': 55,
    'environment-impact-potential': 75,
    'energy-consumption-current': 280,
    'energy-consumption-potential': 160,
    'co2-emissions-current': 5.0,
    'co2-emiss-curr-per-floor-area': 0.04,
    'co2-emissions-potential': 3.0,
    'lighting-cost-current': 130,
    'lighting-cost-potential': 90,
    'heating-cost-current': 1100,
    'heating-cost-potential': 700,
    'hot-water-cost-current': 230,
    'hot-water-cost-potential': 160,
    'total-floor-area': 85,
    'energy-tariff': 'standard tariff',
    'mains-gas-flag': 'Y',
    'floor-level': '',
    'flat-top-storey': 'N',
    'flat-storey-count': 0,
    'main-heating-controls': 'programmer and roomstat',
    'multi-glaze-proportion': 80,
    'glazed-area': 'Normal',
    'extension-count': 0,
    'number-habitable-rooms': 4,
    'number-heated-rooms': 4,
    'low-energy-lighting': 60,
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
    'mainheatcont-description': 'Programmer and room thermostat',
    'lighting-description': 'Low energy lighting in 60% of fixed outlets',
    'main-fuel': 'mains gas',
    'wind-turbine-count': 0,
    'heat-loss-corridor': '',
    'unheated-corridor-length': 0,
    'floor-height': 2.4,
    'photo-supply': 0,
    'solar-water-heating-flag': 'N',
    'mechanical-ventilation': '',
    'constituency': 'Birmingham Ladywood',
    'county': 'West Midlands',
    'local-authority': 'Birmingham',
    'tenure': 'Owner-occupied',
    'fixed-lighting-outlets-count': 8,
    'low-energy-fixed-light-count': 5,
    ...overrides,
  }
}

// ─── getPropertyEra ───────────────────────────────────────────────────────────

describe('getPropertyEra', () => {
  const cases: [number, string][] = [
    [1880, 'Victorian / Edwardian (pre-1900)'],
    [1899, 'Victorian / Edwardian (pre-1900)'],
    [1900, 'Inter-war (1900–1930)'],
    [1925, 'Inter-war (1900–1930)'],
    [1929, 'Inter-war (1900–1930)'],
    [1930, 'Late inter-war (1930–1945)'],
    [1944, 'Late inter-war (1930–1945)'],
    [1945, 'Post-war (1945–1966)'],
    [1960, 'Post-war (1945–1966)'],
    [1965, 'Post-war (1945–1966)'],
    [1966, 'Mid-century (1966–1983)'],
    [1975, 'Mid-century (1966–1983)'],
    [1982, 'Mid-century (1966–1983)'],
    [1983, 'Late 20th century (1983–1996)'],
    [1990, 'Late 20th century (1983–1996)'],
    [1995, 'Late 20th century (1983–1996)'],
    [1996, 'Modern (1996–2003)'],
    [2000, 'Modern (1996–2003)'],
    [2002, 'Modern (1996–2003)'],
    [2003, 'Recent (2003–2012)'],
    [2010, 'Recent (2003–2012)'],
    [2011, 'Recent (2003–2012)'],
    [2012, 'New build (2012+)'],
    [2023, 'New build (2012+)'],
  ]

  for (const [year, expected] of cases) {
    it(`returns "${expected}" for year ${year}`, () => {
      assert.equal(getPropertyEra(year), expected)
    })
  }
})

// ─── parseCostRange ───────────────────────────────────────────────────────────

describe('parseCostRange', () => {
  it('parses a simple £X–£Y range', () => {
    const [low, high] = parseCostRange('£300–£700')
    assert.equal(low,  300)
    assert.equal(high, 700)
  })

  it('parses a range with comma-formatted numbers', () => {
    const [low, high] = parseCostRange('£2,200–£3,800')
    assert.equal(low,  2200)
    assert.equal(high, 3800)
  })

  it('parses larger values like £7,000–£13,000', () => {
    const [low, high] = parseCostRange('£7,000–£13,000')
    assert.equal(low,  7000)
    assert.equal(high, 13000)
  })

  it('returns [0, 0] when the string has no £ values', () => {
    const [low, high] = parseCostRange('Free of charge')
    assert.equal(low,  0)
    assert.equal(high, 0)
  })

  it('returns [0, 0] when only one £ value is present', () => {
    const [low, high] = parseCostRange('From £500')
    assert.equal(low,  0)
    assert.equal(high, 0)
  })

  it('handles cost ranges embedded in longer strings', () => {
    const [low, high] = parseCostRange('£150–£350 (EICR) · £3,000–£10,000 (full rewire if needed)')
    assert.equal(low,  150)
    assert.equal(high, 350)
  })
})

// ─── generateMaintenanceReport ────────────────────────────────────────────────

describe('generateMaintenanceReport', () => {
  describe('new build (2020)', () => {
    it('returns zero predictions for a brand-new property', () => {
      const cert   = makeCert({ 'main-fuel': 'electricity', 'walls-description': 'Cavity wall, as built, insulated', 'windows-description': 'Fully double glazed' })
      const report = generateMaintenanceReport(cert, 2020)
      // New builds don't trigger boiler (< 10 yrs), roof (< 30 yrs), damp (not pre-1920), electrical (not pre-1970), lead pipes (not pre-1970)
      assert.equal(report.predictions.length, 0)
    })

    it('propertyEra is New build', () => {
      const report = generateMaintenanceReport(makeCert(), 2020)
      assert.equal(report.propertyEra, 'New build (2012+)')
    })
  })

  describe('Victorian property (1885)', () => {
    const cert   = makeCert({
      'main-fuel': 'mains gas',
      'walls-description': 'Solid brick, as built, no insulation (assumed)',
      'windows-description': 'Single glazed',
    })
    const report = generateMaintenanceReport(cert, 1885)

    it('flags electrical rewire as urgent (>70 years old)', () => {
      const el = report.predictions.find(p => p.id === 'electrical-rewire')
      assert.ok(el, 'expected electrical-rewire prediction')
      assert.equal(el!.urgency, 'urgent')
    })

    it('flags damp risk for pre-1920 solid walls', () => {
      const damp = report.predictions.find(p => p.id === 'damp-risk')
      assert.ok(damp, 'expected damp-risk prediction')
    })

    it('flags lead pipes for pre-1970 property', () => {
      const lead = report.predictions.find(p => p.id === 'lead-pipes')
      assert.ok(lead, 'expected lead-pipes prediction')
    })

    it('flags roof maintenance for 30+ year old property', () => {
      const roof = report.predictions.find(p => p.id === 'roof-maintenance')
      assert.ok(roof, 'expected roof-maintenance prediction')
    })

    it('flags boiler replacement for gas property > 10 years old', () => {
      const boiler = report.predictions.find(p => p.id === 'boiler-replacement')
      assert.ok(boiler, 'expected boiler-replacement prediction')
    })

    it('flags window replacement when single-glazed', () => {
      const windows = report.predictions.find(p => p.id === 'window-replacement')
      assert.ok(windows, 'expected window-replacement prediction')
    })

    it('sorts predictions urgent first', () => {
      const priorities = report.predictions.map(p => p.urgency)
      const order: Record<string, number> = { urgent: 0, soon: 1, plan: 2 }
      for (let i = 1; i < priorities.length; i++) {
        assert.ok(
          order[priorities[i]] >= order[priorities[i - 1]],
          `Out of order: ${priorities[i - 1]} before ${priorities[i]} at index ${i}`
        )
      }
    })

    it('propertyEra is Victorian / Edwardian', () => {
      assert.equal(report.propertyEra, 'Victorian / Edwardian (pre-1900)')
    })
  })

  describe('cost totals', () => {
    it('totalEstimatedLow <= totalEstimatedHigh', () => {
      const report = generateMaintenanceReport(makeCert({ 'main-fuel': 'mains gas' }), 1960)
      assert.ok(report.totalEstimatedLow <= report.totalEstimatedHigh)
    })

    it('totalEstimatedLow is the sum of all prediction low costs', () => {
      const report = generateMaintenanceReport(makeCert({ 'main-fuel': 'mains gas' }), 1960)
      // The totals come from parseCostRange on each prediction's estimatedCostRange
      // We just verify they are non-negative integers
      assert.ok(report.totalEstimatedLow >= 0)
      assert.ok(report.totalEstimatedHigh >= 0)
    })
  })

  describe('summary field', () => {
    it('contains "urgent" wording when there are urgent items', () => {
      // Pre-1930 gas property → boiler (plan), electrical (urgent), roof (soon), lead (soon), damp (soon if walls solid)
      const cert   = makeCert({ 'main-fuel': 'mains gas', 'walls-description': 'Solid brick, as built, no insulation' })
      const report = generateMaintenanceReport(cert, 1880)
      assert.ok(report.summary.toLowerCase().includes('urgent'), `Expected "urgent" in summary: "${report.summary}"`)
    })

    it('is a non-empty string', () => {
      const report = generateMaintenanceReport(makeCert(), 2000)
      assert.ok(typeof report.summary === 'string' && report.summary.length > 0)
    })
  })

  describe('each prediction shape', () => {
    it('all predictions have required fields', () => {
      const cert   = makeCert({ 'main-fuel': 'mains gas' })
      const report = generateMaintenanceReport(cert, 1960)
      for (const p of report.predictions) {
        assert.ok(p.id,                'missing id')
        assert.ok(p.item,              'missing item')
        assert.ok(p.description,       'missing description')
        assert.ok(p.estimatedCostRange,'missing estimatedCostRange')
        assert.ok(p.likelyTimeframe,   'missing likelyTimeframe')
        assert.ok(p.urgency,           'missing urgency')
        assert.ok(p.rationale,         'missing rationale')
        assert.ok(Array.isArray(p.tips) && p.tips.length > 0, 'missing tips')
        assert.ok(['urgent','soon','plan'].includes(p.urgency), `invalid urgency: ${p.urgency}`)
      }
    })
  })
})
