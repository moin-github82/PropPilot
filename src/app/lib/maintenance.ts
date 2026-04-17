/**
 * Maintenance Prediction Engine
 *
 * Rules-based predictor using property age, type, and EPC data.
 * No ML required at launch — expand to XGBoost model once you
 * have real user data (target: 1,000+ properties with outcomes).
 */

import type { EPCCertificate } from './epc'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Urgency = 'urgent' | 'soon' | 'plan'

export interface MaintenancePrediction {
  id: string
  item: string
  description: string
  estimatedCostRange: string
  likelyTimeframe: string
  urgency: Urgency
  rationale: string
  tips: string[]
}

export interface MaintenanceReport {
  predictions: MaintenancePrediction[]
  totalEstimatedLow: number
  totalEstimatedHigh: number
  propertyEra: string
  summary: string
}

// ─── Property era classification ─────────────────────────────────────────────

function getPropertyEra(constructionYear: number): string {
  if (constructionYear < 1900)  return 'Victorian / Edwardian (pre-1900)'
  if (constructionYear < 1930)  return 'Inter-war (1900–1930)'
  if (constructionYear < 1945)  return 'Late inter-war (1930–1945)'
  if (constructionYear < 1966)  return 'Post-war (1945–1966)'
  if (constructionYear < 1983)  return 'Mid-century (1966–1983)'
  if (constructionYear < 1996)  return 'Late 20th century (1983–1996)'
  if (constructionYear < 2003)  return 'Modern (1996–2003)'
  if (constructionYear < 2012)  return 'Recent (2003–2012)'
  return 'New build (2012+)'
}

// ─── Cost range parser ────────────────────────────────────────────────────────

function parseCostRange(range: string): [number, number] {
  const matches = range.match(/£([\d,]+)/g)
  if (!matches || matches.length < 2) return [0, 0]
  const parse = (s: string) => parseInt(s.replace(/[£,]/g, ''), 10)
  return [parse(matches[0]), parse(matches[1])]
}

// ─── Prediction rules ─────────────────────────────────────────────────────────

interface PredictionRule {
  id: string
  check: (cert: EPCCertificate, yearBuilt: number) => boolean
  build: (cert: EPCCertificate, yearBuilt: number) => MaintenancePrediction
}

const PREDICTION_RULES: PredictionRule[] = [
  // ── Boiler ──────────────────────────────────────────────────────────────────
  {
    id: 'boiler-replacement',
    check: (cert, yearBuilt) =>
      (cert['main-fuel'] === 'mains gas' || cert['main-fuel'] === 'oil') &&
      yearBuilt < new Date().getFullYear() - 10,
    build: (cert, yearBuilt) => {
      const age = new Date().getFullYear() - yearBuilt
      const urgency: Urgency = age > 25 ? 'urgent' : age > 18 ? 'soon' : 'plan'
      return {
        id: 'boiler-replacement',
        item: 'Boiler replacement',
        description: 'Gas or oil boilers typically last 15–20 years. An aging boiler is less efficient and more likely to fail in winter.',
        estimatedCostRange: '£2,200–£3,800',
        likelyTimeframe: age > 25 ? 'Within 1–2 years' : age > 18 ? 'Within 3–5 years' : 'Within 5–10 years',
        urgency,
        rationale: `Your property was built around ${yearBuilt}, suggesting a boiler age of ${age} years — above the typical 15–20 year lifespan.`,
        tips: [
          'Get 3 quotes before replacing — costs vary significantly by installer.',
          'Consider replacing with an air source heat pump to qualify for the £7,500 Boiler Upgrade Scheme grant.',
          'A new A-rated boiler typically saves £200–£400/yr vs an older G-rated unit.',
        ],
      }
    },
  },

  // ── Roof ─────────────────────────────────────────────────────────────────────
  {
    id: 'roof-maintenance',
    check: (_cert, yearBuilt) => yearBuilt < new Date().getFullYear() - 30,
    build: (_cert, yearBuilt) => {
      const age = new Date().getFullYear() - yearBuilt
      return {
        id: 'roof-maintenance',
        item: 'Roof inspection and possible re-roofing',
        description: 'Felt flat roofs last 20–30 years; pitched tiled roofs last 50–100 years but need periodic maintenance. Properties over 30 years old warrant a check.',
        estimatedCostRange: age > 60 ? '£5,000–£15,000' : '£800–£3,500',
        likelyTimeframe: age > 60 ? 'Within 5 years' : 'Within 10 years',
        urgency: age > 60 ? 'soon' : 'plan',
        rationale: `Built around ${yearBuilt} — roof structures at this age commonly develop worn flashings, slipped tiles, or deteriorating felt.`,
        tips: [
          'Annual visual checks from ground level can spot loose or missing tiles early.',
          'Moss build-up can trap moisture — a professional clean every 3–5 years is worthwhile.',
          'Always get a party wall agreement in writing if roof work is near a boundary.',
        ],
      }
    },
  },

  // ── Damp (older solid-wall properties) ───────────────────────────────────────
  {
    id: 'damp-risk',
    check: (cert, yearBuilt) =>
      yearBuilt < 1920 &&
      typeof cert['walls-description'] === 'string' &&
      cert['walls-description'].toLowerCase().includes('solid'),
    build: (_cert, yearBuilt) => ({
      id: 'damp-risk',
      item: 'Damp investigation',
      description: 'Solid-wall Victorian and Edwardian properties are more susceptible to rising and penetrating damp. Early detection prevents costly structural damage.',
      estimatedCostRange: '£500–£4,000',
      likelyTimeframe: 'Get a survey within 2 years',
      urgency: 'soon',
      rationale: `Pre-1920 solid-wall construction (built ~${yearBuilt}) is the highest risk category for damp. Original lime mortar often needs repointing.`,
      tips: [
        'Look for tide marks on lower walls, peeling wallpaper, and musty smell in basements.',
        'Rising damp (up to 1m high) vs penetrating damp (from outside) need different fixes.',
        'Many companies offer free "damp surveys" but have a financial interest — use an independent RICS surveyor.',
      ],
    }),
  },

  // ── Electrics ────────────────────────────────────────────────────────────────
  {
    id: 'electrical-rewire',
    check: (_cert, yearBuilt) => yearBuilt < 1970,
    build: (_cert, yearBuilt) => {
      const age = new Date().getFullYear() - yearBuilt
      return {
        id: 'electrical-rewire',
        item: 'Electrical installation check (EICR)',
        description: 'Properties wired before 1970 often have rubber-insulated cables which degrade over time. An Electrical Installation Condition Report is strongly recommended.',
        estimatedCostRange: '£150–£350 (EICR) · £3,000–£10,000 (full rewire if needed)',
        likelyTimeframe: 'Get EICR within 1 year',
        urgency: age > 70 ? 'urgent' : 'soon',
        rationale: `Properties built before 1970 (yours ~${yearBuilt}) may still have original wiring. EICR certificates are now required every 5 years for rented properties.`,
        tips: [
          'An EICR test takes 3–6 hours for a typical home and costs £150–£350.',
          'Look for old round-pin sockets, brown or black rubber cables, or a fuse box with ceramic fuses.',
          'Partial rewires targeting specific circuits are often a cost-effective middle ground.',
        ],
      }
    },
  },

  // ── Single glazing ────────────────────────────────────────────────────────────
  {
    id: 'window-replacement',
    check: cert =>
      typeof cert['windows-description'] === 'string' &&
      cert['windows-description'].toLowerCase().includes('single glazed'),
    build: () => ({
      id: 'window-replacement',
      item: 'Window replacement (single to double glazing)',
      description: 'Single-glazed windows are a major source of heat loss, adding substantially to energy bills and reducing comfort.',
      estimatedCostRange: '£3,000–£8,000',
      likelyTimeframe: 'Within 3–5 years',
      urgency: 'soon',
      rationale: 'Your EPC certificate shows single-glazed windows throughout. Replacing them can cut heating costs by up to £235/yr.',
      tips: [
        'FENSA-registered installers self-certify compliance with building regulations — always use one.',
        'Triple glazing offers better performance but costs ~30% more and has a longer payback period.',
        'Conservation areas may restrict replacement window styles — check with your local council.',
      ],
    }),
  },

  // ── Flat roof (if applicable) ─────────────────────────────────────────────────
  {
    id: 'flat-roof',
    check: (cert, yearBuilt) =>
      yearBuilt > 1950 && yearBuilt < 1990 &&
      ['flat', 'Flat'].some(t => cert['built-form']?.includes(t) || cert['property-type']?.toLowerCase().includes('flat')),
    build: () => ({
      id: 'flat-roof',
      item: 'Flat roof inspection and possible replacement',
      description: 'Felt flat roofs have a lifespan of 15–25 years. Those from the 1960s–80s are likely at or past end of life.',
      estimatedCostRange: '£1,500–£5,000',
      likelyTimeframe: 'Get inspection within 2 years',
      urgency: 'soon',
      rationale: 'Flat-roofed properties from this era frequently need full replacement of felt membranes, often with modern GRP (fibreglass) alternatives.',
      tips: [
        'GRP fibreglass roofing lasts 25+ years and is now the preferred replacement material.',
        'Ponding water (pools sitting after rain) is a key warning sign of drainage failure.',
        'Budget an extra 20% for potential structural board replacement when stripping old felt.',
      ],
    }),
  },

  // ── Plumbing (lead pipes, pre-1970) ───────────────────────────────────────────
  {
    id: 'lead-pipes',
    check: (_cert, yearBuilt) => yearBuilt < 1970,
    build: (_cert, yearBuilt) => ({
      id: 'lead-pipes',
      item: 'Lead pipe check',
      description: 'Homes built before 1970 may still have lead supply pipes from the mains to the property. Lead in drinking water is a health risk.',
      estimatedCostRange: '£1,000–£3,000',
      likelyTimeframe: 'Get assessment within 2 years',
      urgency: 'soon',
      rationale: `Built around ${yearBuilt} — lead mains pipes were common until the 1970s and not all were replaced during subsequent renovations.`,
      tips: [
        'Your water supplier may replace the section from the mains to your boundary for free.',
        'You\'re responsible for the section within your property — typically £1,000–£2,000.',
        'Contact your local water company for a free lead check test on your tap water.',
      ],
    }),
  },
]

// ─── Main prediction function ─────────────────────────────────────────────────

/**
 * Generate a maintenance report for a property.
 *
 * @param cert      - EPC certificate data
 * @param yearBuilt - Approximate construction year (from EPC or user input)
 */
export function generateMaintenanceReport(
  cert: EPCCertificate,
  yearBuilt: number
): MaintenanceReport {
  const predictions = PREDICTION_RULES
    .filter(rule => rule.check(cert, yearBuilt))
    .map(rule => rule.build(cert, yearBuilt))
    // Sort: urgent → soon → plan
    .sort((a, b) => {
      const order: Record<Urgency, number> = { urgent: 0, soon: 1, plan: 2 }
      return order[a.urgency] - order[b.urgency]
    })

  // Estimate total cost range
  let totalLow = 0, totalHigh = 0
  for (const p of predictions) {
    const [low, high] = parseCostRange(p.estimatedCostRange)
    totalLow  += low
    totalHigh += high
  }

  const urgentCount = predictions.filter(p => p.urgency === 'urgent').length
  const soonCount   = predictions.filter(p => p.urgency === 'soon').length

  const summary = urgentCount > 0
    ? `${urgentCount} item${urgentCount > 1 ? 's' : ''} need urgent attention. Budget £${totalLow.toLocaleString()}–£${totalHigh.toLocaleString()} over the next 5 years.`
    : soonCount > 0
    ? `${soonCount} maintenance item${soonCount > 1 ? 's' : ''} to address in the next 2–5 years. Estimated cost: £${totalLow.toLocaleString()}–£${totalHigh.toLocaleString()}.`
    : `Your property appears in reasonable shape. Budget £${totalLow.toLocaleString()}–£${totalHigh.toLocaleString()} for long-term maintenance.`

  return {
    predictions,
    totalEstimatedLow: totalLow,
    totalEstimatedHigh: totalHigh,
    propertyEra: getPropertyEra(yearBuilt),
    summary,
  }
}
