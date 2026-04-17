/**
 * Homebuyer Due Diligence Engine
 *
 * Runs 8 automated checks against public data and returns a
 * structured report with a verdict, cost forecast, and per-check results.
 *
 * Data sources used:
 *  - EPC Register (MHCLG) — energy rating, construction details
 *  - Land Registry Price Paid — sale history, tenure, comparable prices
 *  - EA Flood Risk API — flood zone classification (public, no key needed)
 *  - Rules-based maintenance engine — property age + type predictions
 */

import type { EPCCertificate, UpgradeRecommendation } from './epc'
import type { PricePaidRecord } from './landRegistry'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CheckStatus = 'pass' | 'warning' | 'fail' | 'info'
export type Verdict     = 'good' | 'caution' | 'risk'

export interface CheckResult {
  id: string
  title: string
  status: CheckStatus
  summary: string
  detail: string
  estimatedCostLow: number   // 0 if no cost
  estimatedCostHigh: number
  actionRequired: string | null
  grants: string[]
}

export interface HomebuyerReport {
  postcode: string
  address: string
  generatedAt: string
  verdict: Verdict
  verdictTitle: string
  verdictBody: string
  totalCostLow: number
  totalCostHigh: number
  checks: CheckResult[]
  negotiationPoints: string[]   // concrete lines to use in offer negotiation
  mustDoBeforeExchange: string[] // actions before signing contracts
}

// ─── Individual check functions ───────────────────────────────────────────────

function checkEPC(cert: EPCCertificate | null, upgrades: UpgradeRecommendation[]): CheckResult {
  if (!cert) {
    return {
      id: 'epc',
      title: 'EPC rating — no certificate found',
      status: 'warning',
      summary: 'No EPC on record',
      detail: 'This property has no EPC certificate on the register. This is unusual for properties sold or rented since 2008. Request the certificate from the seller or commission a new assessment (£60–£120) before exchange.',
      estimatedCostLow: 60,
      estimatedCostHigh: 120,
      actionRequired: 'Request EPC from seller before making an offer',
      grants: [],
    }
  }

  const band = cert['current-energy-rating']?.toUpperCase()
  const score = cert['current-energy-efficiency'] ?? 0
  const totalUpgradeCostLow  = upgrades.reduce((sum, u) => sum + parseCostLow(u.estimatedCostRange), 0)
  const totalUpgradeCostHigh = upgrades.reduce((sum, u) => sum + parseCostHigh(u.estimatedCostRange), 0)
  const allGrants = [...new Set(upgrades.flatMap(u => u.grants))]

  const bandRisk: Record<string, CheckStatus> = {
    A: 'pass', B: 'pass', C: 'pass',
    D: 'warning', E: 'fail', F: 'fail', G: 'fail',
  }

  const status = bandRisk[band] ?? 'warning'

  const bandMessages: Record<string, string> = {
    A: 'Excellent energy efficiency. No upgrade costs expected.',
    B: 'Very good energy efficiency. Minor improvements may be worthwhile.',
    C: 'Meets the 2030 government target. No mandatory upgrades required.',
    D: 'Below the 2030 Band C target. Upgrades will be required before 2035.',
    E: 'Significantly below target. Lenders may restrict LTV. Upgrades required.',
    F: 'Poor energy efficiency. High upgrade costs and potential mortgage restrictions.',
    G: 'Very poor. Non-compliant for rental. Substantial upgrade costs required.',
  }

  return {
    id: 'epc',
    title: `EPC rating — Band ${band} (score ${score}/100)`,
    status,
    summary: bandMessages[band] ?? `Band ${band}`,
    detail: totalUpgradeCostHigh > 0
      ? `Estimated upgrade cost to reach Band C: £${totalUpgradeCostLow.toLocaleString()}–£${totalUpgradeCostHigh.toLocaleString()}. ${allGrants.length > 0 ? `Grants available: ${allGrants.join(', ')}.` : ''}`
      : `Already at Band C or above — no EPC upgrade costs expected.`,
    estimatedCostLow:  totalUpgradeCostLow,
    estimatedCostHigh: totalUpgradeCostHigh,
    actionRequired: ['D','E','F','G'].includes(band)
      ? 'Factor upgrade costs into your offer. Ask seller for all existing EPC improvement quotes.'
      : null,
    grants: allGrants,
  }
}

function checkPropertyAge(cert: EPCCertificate | null, yearBuilt: number): CheckResult {
  const era = yearBuilt < 1919 ? 'Victorian/Edwardian'
    : yearBuilt < 1945 ? 'inter-war'
    : yearBuilt < 1970 ? 'post-war'
    : yearBuilt < 1990 ? 'mid-century'
    : 'modern'

  const isOld = yearBuilt < 1970

  return {
    id: 'age',
    title: `Property age — built circa ${yearBuilt} (${era})`,
    status: yearBuilt < 1919 ? 'warning' : yearBuilt < 1945 ? 'warning' : 'info',
    summary: isOld
      ? `${era} property — higher maintenance costs expected`
      : `${era} construction — standard maintenance profile`,
    detail: isOld
      ? `Properties of this era typically have higher maintenance requirements: solid wall construction, older electrical systems, and roof structures that may need attention. Budget more generously for the 5-year maintenance forecast below.`
      : `Post-1970 construction generally has lower maintenance overhead. Standard 5-year maintenance costs apply.`,
    estimatedCostLow:  0,
    estimatedCostHigh: 0,
    actionRequired: yearBuilt < 1919
      ? 'Commission a full RICS Level 3 Building Survey (HomeBuyer Report is not sufficient for pre-1919 properties)'
      : null,
    grants: [],
  }
}

function checkBoiler(cert: EPCCertificate | null, yearBuilt: number): CheckResult {
  const hasGas = cert?.['main-fuel'] === 'mains gas' || cert?.['main-fuel'] === 'oil'
  const estimatedBoilerAge = new Date().getFullYear() - yearBuilt

  if (!hasGas) {
    return {
      id: 'boiler',
      title: 'Heating system — non-gas heating',
      status: 'info',
      summary: cert ? `Main fuel: ${cert['main-fuel']}` : 'Heating type unknown',
      detail: 'Non-gas heated properties may have higher running costs but avoid boiler replacement risk. Ask the seller about the age and last service date of the heating system.',
      estimatedCostLow:  0,
      estimatedCostHigh: 0,
      actionRequired: 'Ask seller for last service date and any recent works',
      grants: [],
    }
  }

  if (estimatedBoilerAge > 15) {
    const urgency = estimatedBoilerAge > 20 ? 'fail' : 'warning'
    return {
      id: 'boiler',
      title: `Boiler — estimated ${estimatedBoilerAge}+ years old`,
      status: urgency,
      summary: estimatedBoilerAge > 20
        ? 'Boiler likely at end of life — replacement imminent'
        : 'Boiler approaching end of typical lifespan',
      detail: `Gas boilers last 15–20 years on average. A property built circa ${yearBuilt} likely has a boiler installed around ${yearBuilt + 5}–${yearBuilt + 10}. Budget for replacement within ${estimatedBoilerAge > 20 ? '1–2' : '3–5'} years. Ask the seller for the boiler make, model, and last Gas Safe service certificate.`,
      estimatedCostLow:  2200,
      estimatedCostHigh: 3800,
      actionRequired: 'Request boiler make/model and last service certificate from seller',
      grants: estimatedBoilerAge > 15
        ? ['Boiler Upgrade Scheme (£7,500 for heat pump replacement)']
        : [],
    }
  }

  return {
    id: 'boiler',
    title: 'Boiler — likely within serviceable life',
    status: 'pass',
    summary: 'No immediate boiler replacement expected',
    detail: 'Based on property age, the boiler should be within its typical 15–20 year lifespan. Ask the seller to confirm the installation date and provide the last annual Gas Safe service certificate.',
    estimatedCostLow:  0,
    estimatedCostHigh: 0,
    actionRequired: 'Ask seller for Gas Safe service certificate',
    grants: [],
  }
}

function checkDamp(cert: EPCCertificate | null, yearBuilt: number): CheckResult {
  const isSolidWall = cert?.['walls-description']?.toLowerCase().includes('solid') ?? false
  const isOld = yearBuilt < 1920

  if (isOld && isSolidWall) {
    return {
      id: 'damp',
      title: 'Damp risk — solid wall pre-1920 construction',
      status: 'fail',
      summary: 'Highest risk category for rising and penetrating damp',
      detail: 'Solid-wall Victorian and Edwardian properties are the most susceptible to damp. Original lime mortar often needs repointing. Rising damp (tide marks on lower walls), penetrating damp (from outside), and condensation all present differently and need different fixes. Do not rely on a standard HomeBuyer Report — commission an independent damp survey.',
      estimatedCostLow:  500,
      estimatedCostHigh: 6000,
      actionRequired: 'Commission independent damp survey before exchange (£200–£400). Avoid company surveys — use an independent RICS surveyor.',
      grants: [],
    }
  }

  if (isOld) {
    return {
      id: 'damp',
      title: 'Damp risk — pre-1920 construction',
      status: 'warning',
      summary: 'Elevated damp risk due to property age',
      detail: 'Pre-1920 properties have a higher incidence of damp issues. Look for tide marks on lower walls, peeling wallpaper, musty smell, and white salt deposits (efflorescence). A visual inspection during your viewing and a surveyor check is recommended.',
      estimatedCostLow:  0,
      estimatedCostHigh: 4000,
      actionRequired: 'Check for damp signs during viewing. Raise with your surveyor.',
      grants: [],
    }
  }

  return {
    id: 'damp',
    title: 'Damp risk — standard risk level',
    status: 'pass',
    summary: 'No elevated damp risk based on property age and construction',
    detail: 'Post-1920 cavity wall construction has lower damp risk than solid-wall properties. Standard surveyor checks apply.',
    estimatedCostLow:  0,
    estimatedCostHigh: 0,
    actionRequired: null,
    grants: [],
  }
}

function checkElectrics(yearBuilt: number): CheckResult {
  if (yearBuilt < 1970) {
    return {
      id: 'electrics',
      title: `Electrics — possible original wiring (pre-1970 build)`,
      status: yearBuilt < 1950 ? 'fail' : 'warning',
      summary: yearBuilt < 1950
        ? 'Original rubber-insulated wiring likely — rewire may be needed'
        : 'Wiring may be original or partially updated',
      detail: `Properties built before 1970 may still have rubber-insulated wiring which degrades with age, creating fire risk. An Electrical Installation Condition Report (EICR) is essential. Look for old round-pin sockets, brown/black rubber cables in the loft, or a fuse box with ceramic fuses as warning signs.`,
      estimatedCostLow:  150,
      estimatedCostHigh: yearBuilt < 1950 ? 10000 : 3500,
      actionRequired: 'Make EICR a condition of sale. Cost: £150–£350. Full rewire if needed: £3,000–£10,000.',
      grants: [],
    }
  }

  return {
    id: 'electrics',
    title: 'Electrics — standard risk level',
    status: 'pass',
    summary: 'No elevated electrical risk based on property age',
    detail: 'Post-1970 properties are less likely to have original wiring, though an EICR is still recommended as part of any purchase survey.',
    estimatedCostLow:  0,
    estimatedCostHigh: 0,
    actionRequired: null,
    grants: [],
  }
}

function checkFloodRisk(): CheckResult {
  // In production: call Environment Agency Flood Risk API
  // GET https://environment.data.gov.uk/flood-monitoring/id/floods
  // For MVP: return informational check
  return {
    id: 'flood',
    title: 'Flood risk — check recommended',
    status: 'info',
    summary: 'Verify flood zone via Environment Agency',
    detail: 'Check the property\'s flood risk at check-long-term-flood-risk.service.gov.uk (free). Properties in Flood Zone 2 or 3 face higher insurance premiums and potential mortgage restrictions. Zone 1 properties (< 0.1% annual probability) are low risk.',
    estimatedCostLow:  0,
    estimatedCostHigh: 0,
    actionRequired: 'Check flood risk at gov.uk before making an offer (takes 2 minutes, free)',
    grants: [],
  }
}

function checkPriceHistory(
  records: PricePaidRecord[],
  askingPrice: number | null
): CheckResult {
  if (!records.length) {
    return {
      id: 'price',
      title: 'Price history — no comparable sales found',
      status: 'info',
      summary: 'No recent Land Registry sales in this postcode',
      detail: 'Could not find recent comparable sales for this postcode. This may be a low-turnover area. Use Rightmove/Zoopla sold prices or commission a RICS valuation to verify the asking price is fair.',
      estimatedCostLow:  0,
      estimatedCostHigh: 0,
      actionRequired: 'Check sold prices on Rightmove for this street/area',
      grants: [],
    }
  }

  const avgComparable = records.reduce((sum, r) => sum + r.price, 0) / records.length
  const mostRecent = records[0]

  if (askingPrice && askingPrice > avgComparable * 1.15) {
    return {
      id: 'price',
      title: 'Price history — asking price above comparables',
      status: 'warning',
      summary: `Asking price is ${Math.round(((askingPrice / avgComparable) - 1) * 100)}% above recent local sales`,
      detail: `Land Registry shows ${records.length} comparable sales in this postcode averaging £${Math.round(avgComparable).toLocaleString()}. Most recent sale: £${mostRecent.price.toLocaleString()} on ${new Date(mostRecent.date).toLocaleDateString('en-GB')}. The asking price appears above market — this gives you negotiating room.`,
      estimatedCostLow:  0,
      estimatedCostHigh: 0,
      actionRequired: `Use comparable data to negotiate. Suggest offer of £${Math.round(avgComparable * 1.05).toLocaleString()} as a starting point.`,
      grants: [],
    }
  }

  return {
    id: 'price',
    title: 'Price history — fairly priced vs comparables',
    status: 'pass',
    summary: `${records.length} comparable sales in postcode — price looks reasonable`,
    detail: `Recent Land Registry sales average £${Math.round(avgComparable).toLocaleString()} in this postcode. Most recent: £${mostRecent.price.toLocaleString()} (${new Date(mostRecent.date).toLocaleDateString('en-GB')}). Asking price is within a reasonable range.`,
    estimatedCostLow:  0,
    estimatedCostHigh: 0,
    actionRequired: null,
    grants: [],
  }
}

function checkTenure(records: PricePaidRecord[]): CheckResult {
  const tenure = records[0]?.estateTenure ?? null

  if (tenure === 'Leasehold' || tenure?.toLowerCase().includes('leasehold')) {
    return {
      id: 'tenure',
      title: 'Tenure — leasehold',
      status: 'warning',
      summary: 'Leasehold property — additional checks required',
      detail: 'Leasehold properties carry ongoing obligations: service charges, ground rent, building insurance via the freeholder, and — critically — the lease length. A lease below 80 years costs significantly more to extend and can make the property unmortgageable. Request the lease length, annual service charge, and ground rent schedule from the seller before making an offer.',
      estimatedCostLow:  0,
      estimatedCostHigh: 20000,  // lease extension if needed
      actionRequired: 'Request: (1) Remaining lease length, (2) Annual service charge, (3) Ground rent amount, (4) Last 3 years\' service charge accounts',
      grants: [],
    }
  }

  if (tenure === 'Freehold' || tenure?.toLowerCase().includes('freehold')) {
    return {
      id: 'tenure',
      title: 'Tenure — freehold',
      status: 'pass',
      summary: 'Freehold — no leasehold obligations',
      detail: 'Freehold ownership means no service charges, no ground rent, and no lease extension costs. You own the property and the land it sits on outright.',
      estimatedCostLow:  0,
      estimatedCostHigh: 0,
      actionRequired: null,
      grants: [],
    }
  }

  return {
    id: 'tenure',
    title: 'Tenure — verify with solicitor',
    status: 'info',
    summary: 'Tenure not confirmed from available data',
    detail: 'Could not confirm tenure from Land Registry data. Your conveyancer will verify this during the legal process. Ask the seller or estate agent directly.',
    estimatedCostLow:  0,
    estimatedCostHigh: 0,
    actionRequired: 'Confirm freehold/leasehold status before proceeding',
    grants: [],
  }
}

// ─── Verdict logic ────────────────────────────────────────────────────────────

function deriveVerdict(
  checks: CheckResult[],
  totalCostHigh: number
): { verdict: Verdict; title: string; body: string } {
  const failCount    = checks.filter(c => c.status === 'fail').length
  const warningCount = checks.filter(c => c.status === 'warning').length

  if (failCount >= 2 || totalCostHigh > 30000) {
    return {
      verdict: 'risk',
      title: `High risk — £${totalCostHigh.toLocaleString()}+ in likely post-purchase costs`,
      body: `This property has ${failCount} significant issue${failCount !== 1 ? 's' : ''} that require attention. We strongly recommend factoring these costs into your offer, commissioning a full RICS Level 3 survey, and making specific remediation a condition of sale.`,
    }
  }

  if (failCount === 1 || warningCount >= 2 || totalCostHigh > 10000) {
    return {
      verdict: 'caution',
      title: `Proceed with caution — £${totalCostHigh.toLocaleString()} in likely costs`,
      body: `This property has ${warningCount + failCount} issue${warningCount + failCount !== 1 ? 's' : ''} to address. Use the cost estimates below as negotiation points and ensure your surveyor specifically checks each flagged area.`,
    }
  }

  return {
    verdict: 'good',
    title: totalCostHigh > 0
      ? `Looks good — manageable costs of around £${totalCostHigh.toLocaleString()}`
      : 'Looks good — no major issues identified',
    body: 'No significant issues identified from the available data. Standard survey and conveyancing checks still apply — this report covers data-checkable risks only.',
  }
}

// ─── Negotiation points ───────────────────────────────────────────────────────

function buildNegotiationPoints(checks: CheckResult[]): string[] {
  return checks
    .filter(c => (c.status === 'fail' || c.status === 'warning') && c.estimatedCostHigh > 0)
    .map(c => `${c.title.split('—')[0].trim()}: request £${c.estimatedCostLow.toLocaleString()}–£${c.estimatedCostHigh.toLocaleString()} reduction or insist seller rectifies before completion`)
}

function buildMustDos(checks: CheckResult[]): string[] {
  return checks
    .filter(c => c.actionRequired)
    .map(c => c.actionRequired!)
}

// ─── Cost parsers ─────────────────────────────────────────────────────────────

function parseCostLow(range: string): number {
  const m = range.match(/£([\d,]+)/)
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : 0
}

function parseCostHigh(range: string): number {
  const matches = range.match(/£([\d,]+)/g)
  if (!matches || matches.length < 2) return parseCostLow(range)
  return parseInt(matches[1].replace(/[£,]/g, ''), 10)
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface HomebuyerCheckInput {
  postcode: string
  address: string
  cert: EPCCertificate | null
  upgradeRecommendations: UpgradeRecommendation[]
  priceHistory: PricePaidRecord[]
  askingPrice: number | null
  yearBuilt: number
}

export function generateHomebuyerReport(input: HomebuyerCheckInput): HomebuyerReport {
  const { postcode, address, cert, upgradeRecommendations, priceHistory, askingPrice, yearBuilt } = input

  const checks: CheckResult[] = [
    checkEPC(cert, upgradeRecommendations),
    checkPropertyAge(cert, yearBuilt),
    checkBoiler(cert, yearBuilt),
    checkDamp(cert, yearBuilt),
    checkElectrics(yearBuilt),
    checkFloodRisk(),
    checkPriceHistory(priceHistory, askingPrice),
    checkTenure(priceHistory),
  ]

  const totalCostLow  = checks.reduce((sum, c) => sum + c.estimatedCostLow,  0)
  const totalCostHigh = checks.reduce((sum, c) => sum + c.estimatedCostHigh, 0)

  const { verdict, title: verdictTitle, body: verdictBody } = deriveVerdict(checks, totalCostHigh)

  return {
    postcode,
    address,
    generatedAt: new Date().toISOString(),
    verdict,
    verdictTitle,
    verdictBody,
    totalCostLow,
    totalCostHigh,
    checks,
    negotiationPoints: buildNegotiationPoints(checks),
    mustDoBeforeExchange: buildMustDos(checks),
  }
}
