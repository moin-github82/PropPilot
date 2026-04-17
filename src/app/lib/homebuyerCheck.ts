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
import type { CrimeSummary } from './crime'
import type { BroadbandCoverage } from './broadband'
import type { PlanningSummary } from './planning'
import type { CouncilTaxInfo } from './councilTax'

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
  askingPrice: number | null,
  comparablePropertyType: string | null | undefined
): CheckResult {
  // Human-readable label for messages, e.g. "semi-detached" or "flat"
  const typeLabel = comparablePropertyType
    ? comparablePropertyType.toLowerCase()
    : 'property'

  if (!records.length) {
    return {
      id: 'price',
      title: `Price history — no comparable ${typeLabel} sales found`,
      status: 'info',
      summary: `No recent Land Registry ${typeLabel} sales in this postcode`,
      detail: `Could not find recent comparable ${typeLabel} sales for this postcode. This may be a low-turnover area. Use Rightmove/Zoopla sold prices or commission a RICS valuation to verify the asking price is fair.`,
      estimatedCostLow:  0,
      estimatedCostHigh: 0,
      actionRequired: `Check sold ${typeLabel} prices on Rightmove for this street/area`,
      grants: [],
    }
  }

  const avgComparable = records.reduce((sum, r) => sum + r.price, 0) / records.length
  const mostRecent = records[0]
  const typeNote = comparablePropertyType
    ? ` (${comparablePropertyType} only)`
    : ''

  if (askingPrice && askingPrice > avgComparable * 1.15) {
    return {
      id: 'price',
      title: `Price history — asking price above comparable ${typeLabel}s`,
      status: 'warning',
      summary: `Asking price is ${Math.round(((askingPrice / avgComparable) - 1) * 100)}% above recent local ${typeLabel} sales`,
      detail: `Land Registry shows ${records.length} comparable ${typeLabel} sales in this postcode${typeNote} averaging £${Math.round(avgComparable).toLocaleString()}. Most recent sale: £${mostRecent.price.toLocaleString()} on ${new Date(mostRecent.date).toLocaleDateString('en-GB')}. The asking price appears above market — this gives you negotiating room.`,
      estimatedCostLow:  0,
      estimatedCostHigh: 0,
      actionRequired: `Use comparable data to negotiate. Suggest offer of £${Math.round(avgComparable * 1.05).toLocaleString()} as a starting point.`,
      grants: [],
    }
  }

  return {
    id: 'price',
    title: `Price history — fairly priced vs comparable ${typeLabel}s`,
    status: 'pass',
    summary: `${records.length} comparable ${typeLabel} sales in postcode${typeNote} — price looks reasonable`,
    detail: `Recent Land Registry ${typeLabel} sales${typeNote} average £${Math.round(avgComparable).toLocaleString()} in this postcode. Most recent: £${mostRecent.price.toLocaleString()} (${new Date(mostRecent.date).toLocaleDateString('en-GB')}). Asking price is within a reasonable range.`,
    estimatedCostLow:  0,
    estimatedCostHigh: 0,
    actionRequired: null,
    grants: [],
  }
}

function checkCrime(crime: CrimeSummary | null): CheckResult {
  if (!crime) {
    return {
      id: 'crime',
      title: 'Crime — data unavailable',
      status: 'info',
      summary: 'Check crime statistics via Police.uk',
      detail: 'Crime data could not be retrieved for this area. Check manually at police.uk/pu/your-area to review local crime statistics.',
      estimatedCostLow: 0, estimatedCostHigh: 0,
      actionRequired: 'Review crime statistics at police.uk before making an offer',
      grants: [],
    }
  }

  const perMonth = crime.incidentsPerMonth
  const top      = crime.topCategories[0]?.category ?? 'various'

  if (perMonth >= 100) {
    return {
      id: 'crime',
      title: `Crime — high rate (${perMonth}/month average)`,
      status: 'fail',
      summary: `${crime.totalIncidents} incidents in ${crime.monthsAnalysed} months — above average`,
      detail: `Police.uk recorded ${crime.totalIncidents} crimes in a ~1-mile radius over ${crime.monthsAnalysed} months (avg ${perMonth}/month). Most common: ${top}. High crime areas can affect insurance premiums, resale value, and quality of life. Review the Police.uk neighbourhood profile for more detail.`,
      estimatedCostLow: 0, estimatedCostHigh: 0,
      actionRequired: 'Visit police.uk/pu/your-area and review the neighbourhood profile before committing',
      grants: [],
    }
  }

  if (perMonth >= 50) {
    return {
      id: 'crime',
      title: `Crime — moderate rate (${perMonth}/month average)`,
      status: 'warning',
      summary: `${crime.totalIncidents} incidents in ${crime.monthsAnalysed} months — check the neighbourhood profile`,
      detail: `Police.uk recorded ${crime.totalIncidents} crimes in a ~1-mile radius over ${crime.monthsAnalysed} months (avg ${perMonth}/month). Most common: ${top}. This is around the national average — visit the Police.uk neighbourhood page to see trends and compare with nearby areas.`,
      estimatedCostLow: 0, estimatedCostHigh: 0,
      actionRequired: null,
      grants: [],
    }
  }

  return {
    id: 'crime',
    title: `Crime — low rate (${perMonth}/month average)`,
    status: 'pass',
    summary: `${crime.totalIncidents} incidents in ${crime.monthsAnalysed} months — below average`,
    detail: `Police.uk recorded ${crime.totalIncidents} crimes in a ~1-mile radius over ${crime.monthsAnalysed} months (avg ${perMonth}/month). Most common: ${top}. This is a relatively low crime area.`,
    estimatedCostLow: 0, estimatedCostHigh: 0,
    actionRequired: null,
    grants: [],
  }
}

function checkBroadband(coverage: BroadbandCoverage | null, postcode: string): CheckResult {
  const checkUrl = `https://checker.ofcom.org.uk/en-gb/broadband-coverage?postcode=${encodeURIComponent(postcode)}`

  if (!coverage) {
    return {
      id: 'broadband',
      title: 'Broadband — verify via Ofcom checker',
      status: 'info',
      summary: 'Check broadband availability before committing',
      detail: `Broadband data could not be retrieved automatically. Visit the Ofcom broadband checker to see what speeds are available at this postcode. Poor connectivity can significantly affect daily life and property value — especially important for remote workers.`,
      estimatedCostLow: 0, estimatedCostHigh: 0,
      actionRequired: `Check broadband availability: ${checkUrl}`,
      grants: [],
    }
  }

  const { technologyType, maxDownloadMbps, gigabitCapable, superfast } = coverage

  if (!superfast || maxDownloadMbps < 10) {
    return {
      id: 'broadband',
      title: `Broadband — slow (max ${maxDownloadMbps} Mbps, ${technologyType})`,
      status: 'warning',
      summary: 'Below superfast threshold — may affect remote working and streaming',
      detail: `The best available broadband at this postcode is ${maxDownloadMbps} Mbps download via ${technologyType}. This is below the "superfast" threshold of 30 Mbps. For home offices, streaming, or families with multiple devices, this may cause frustration. Check whether full-fibre rollout is planned for this area.`,
      estimatedCostLow: 0, estimatedCostHigh: 0,
      actionRequired: 'Check full-fibre rollout plans via openreach.com/fibre-broadband before committing',
      grants: [],
    }
  }

  const label = gigabitCapable
    ? `Full-fibre gigabit (${maxDownloadMbps} Mbps)`
    : `Superfast ${technologyType} (${maxDownloadMbps} Mbps)`

  return {
    id: 'broadband',
    title: `Broadband — ${label}`,
    status: 'pass',
    summary: gigabitCapable
      ? 'Full-fibre available — future-proofed for home working'
      : `Superfast broadband available (${maxDownloadMbps} Mbps max)`,
    detail: `${label} broadband is available at this postcode.${gigabitCapable ? ' Full-fibre (FTTP) is the gold standard — symmetrical speeds, no degradation at peak times, and future-proofed.' : ' Consider whether full-fibre upgrade is planned for the area.'}`,
    estimatedCostLow: 0, estimatedCostHigh: 0,
    actionRequired: null,
    grants: [],
  }
}

function checkPlanning(planning: PlanningSummary | null): CheckResult {
  if (!planning) {
    return {
      id: 'planning',
      title: 'Planning — check local restrictions manually',
      status: 'info',
      summary: 'Check your local council planning portal',
      detail: 'Planning data could not be retrieved for this postcode. Check the local planning portal to see if there are nearby applications, and verify whether the property is in a conservation area or subject to an Article 4 Direction (which removes permitted development rights).',
      estimatedCostLow: 0, estimatedCostHigh: 0,
      actionRequired: 'Check your local council planning portal',
      grants: [],
    }
  }

  const {
    inConservationArea, conservationAreaName,
    listedBuilding, listedBuildingGrade,
    articleFourDirection, articleFourDescription,
    applicationsFound,
    propertyApplications = [],
    nearbyApplications   = [],
    lpaName, lpaSearchUrl, lpaApplicationsUrl,
  } = planning

  // Restrictions summary for detail text
  const restrictions: string[] = []
  if (inConservationArea) restrictions.push(`conservation area${conservationAreaName ? ` (${conservationAreaName})` : ''}`)
  if (listedBuilding)     restrictions.push(`Grade ${listedBuildingGrade ?? 'II'} listed building`)
  if (articleFourDirection) restrictions.push(`Article 4 Direction${articleFourDescription ? ` — ${articleFourDescription}` : ''}`)

  // Listed building is the most serious flag — needs its own 'fail' card
  if (listedBuilding) {
    return {
      id: 'planning',
      title: `Planning — Grade ${listedBuildingGrade ?? 'II'} listed building`,
      status: 'fail',
      summary: 'Listed building — all alterations require Listed Building Consent',
      detail: `This property is a Grade ${listedBuildingGrade ?? 'II'} listed building. Any works to the structure, interior features, or curtilage require Listed Building Consent (LBC) in addition to normal planning permission — and some works are completely prohibited. Unauthorised works are a criminal offence. Maintenance and restoration costs are significantly higher; standard materials (PVC windows, modern insulation) are generally not permitted. Specialist listed building insurance is essential. Check the ${lpaName} planning portal for any enforcement notices.`,
      estimatedCostLow: 0, estimatedCostHigh: 0,
      actionRequired: `Instruct a specialist heritage surveyor (RICS or IHBC) before committing. Review ${lpaApplicationsUrl} for enforcement history.`,
      grants: ['Historic England grants (for Grade I/II* only)', 'Some local authority conservation grants'],
    }
  }

  // Conservation area + Article 4 together
  if (inConservationArea && articleFourDirection) {
    return {
      id: 'planning',
      title: `Planning — conservation area + Article 4 Direction`,
      status: 'warning',
      summary: 'Restricted: permitted development rights removed — planning permission needed for most works',
      detail: `This property sits within a conservation area${conservationAreaName ? ` (${conservationAreaName})` : ''} and is subject to an Article 4 Direction, which removes most permitted development rights. Extensions, loft conversions, replacement windows, and external cladding all require full planning permission. Refusals are more common in conservation areas. This affects what you can do with the property and timeline for any works.`,
      estimatedCostLow: 0, estimatedCostHigh: 0,
      actionRequired: `Check approved/refused applications on the ${lpaName} portal to understand what changes are typically permitted`,
      grants: [],
    }
  }

  // Conservation area alone
  if (inConservationArea) {
    return {
      id: 'planning',
      title: `Planning — conservation area${conservationAreaName ? ` (${conservationAreaName})` : ''}`,
      status: 'warning',
      summary: 'Conservation area — external changes require permission and must use approved materials',
      detail: `This property is within the ${conservationAreaName ?? 'local'} conservation area. Demolition, significant extensions, and changes to the external appearance (including roof materials and windows) require planning permission. Permitted development rights may be more restricted than a standard property. Conservation area status protects the neighbourhood character and can support property value, but limits what changes you can make without permission.`,
      estimatedCostLow: 0, estimatedCostHigh: 0,
      actionRequired: `Review approved applications at ${lpaSearchUrl} to understand what changes have been allowed on similar properties`,
      grants: [],
    }
  }

  // Article 4 Direction alone
  if (articleFourDirection) {
    return {
      id: 'planning',
      title: 'Planning — Article 4 Direction in place',
      status: 'warning',
      summary: 'Permitted development rights removed — check before planning any works',
      detail: `An Article 4 Direction applies to this area${articleFourDescription ? `: ${articleFourDescription}` : ''}. This removes some or all permitted development rights — works that would normally not need planning permission (e.g. extensions, loft conversions) may now require a full application. Check the direction's specific scope with ${lpaName} before planning any alterations.`,
      estimatedCostLow: 0, estimatedCostHigh: 0,
      actionRequired: `Contact ${lpaName} planning department to confirm which permitted development rights have been removed`,
      grants: [],
    }
  }

  // ── Property application history (last 5 years) ──────────────────────────
  // Even when no designation restrictions exist, refused or pending applications
  // on the property itself are a meaningful signal and warrant a warning.
  const refusedOnProperty = propertyApplications.filter(a => a.decisionType === 'refused')
  const pendingOnProperty  = propertyApplications.filter(a => a.decisionType === 'pending')
  const approvedOnProperty = propertyApplications.filter(a => a.decisionType === 'approved')

  if (refusedOnProperty.length > 0) {
    const refs = refusedOnProperty.map(a => `"${a.description.slice(0, 80)}"${a.date ? ` (${a.date})` : ''}`).join('; ')
    return {
      id: 'planning',
      title: `Planning — ${refusedOnProperty.length} refused application${refusedOnProperty.length !== 1 ? 's' : ''} on this property`,
      status: 'warning',
      summary: `Previous planning refusal${refusedOnProperty.length !== 1 ? 's' : ''} recorded in the last 5 years — ask seller for details`,
      detail: `${lpaName} planning records show ${refusedOnProperty.length} refused planning application${refusedOnProperty.length !== 1 ? 's' : ''} on this property in the last 5 years: ${refs}. A refusal can indicate the council will not permit certain changes (e.g. extensions, change of use). Ask the seller why it was refused and whether enforcement notices were issued. Check the full history on the ${lpaName} portal.`,
      estimatedCostLow: 0, estimatedCostHigh: 0,
      actionRequired: `Ask seller for all planning correspondence and check enforcement history at ${lpaApplicationsUrl}`,
      grants: [],
    }
  }

  if (pendingOnProperty.length > 0) {
    const refs = pendingOnProperty.map(a => `"${a.description.slice(0, 80)}"`).join('; ')
    return {
      id: 'planning',
      title: `Planning — ${pendingOnProperty.length} pending application${pendingOnProperty.length !== 1 ? 's' : ''} on this property`,
      status: 'warning',
      summary: 'Active planning application on this property — outcome may affect your purchase',
      detail: `There ${pendingOnProperty.length === 1 ? 'is' : 'are'} ${pendingOnProperty.length} pending planning application${pendingOnProperty.length !== 1 ? 's' : ''} on this property: ${refs}. The outcome could affect what you can do with the property, and an approval may have conditions attached. Ask the seller for full details and your solicitor to check for any conditions or obligations.`,
      estimatedCostLow: 0, estimatedCostHigh: 0,
      actionRequired: `Ask seller about the pending application and instruct your solicitor to review it`,
      grants: [],
    }
  }

  // Approved applications on property — helpful to know (work may be permitted but not yet done)
  const approvedNote = approvedOnProperty.length > 0
    ? ` ${approvedOnProperty.length} approved application${approvedOnProperty.length !== 1 ? 's' : ''} on record (last 5 years) — ask seller if any approved works remain outstanding.`
    : ''

  // No restrictions — show application summary
  const nearbyNote = nearbyApplications.length > 0
    ? ` ${nearbyApplications.length} nearby application${nearbyApplications.length !== 1 ? 's' : ''} found within 500 m.`
    : ''

  const hasAnyApplicationData = applicationsFound > 0

  return {
    id: 'planning',
    title: 'Planning — no major restrictions identified',
    status: 'pass',
    summary: `No conservation area, listed building, or Article 4 Direction.${approvedNote || nearbyNote || ' No applications found in the last 5 years.'}`,
    detail: hasAnyApplicationData
      ? `No planning restrictions found.${approvedNote}${nearbyNote} You can review the full history on the ${lpaName} planning portal.`
      : `No planning designations or applications found via the national planning dataset for this location (coverage is limited to ~30 pilot councils). Standard permitted development rights apply, but always verify directly with ${lpaName} planning department.`,
    estimatedCostLow: 0, estimatedCostHigh: 0,
    actionRequired: hasAnyApplicationData
      ? (approvedOnProperty.length > 0 ? `Ask seller about approved but outstanding works — check at ${lpaApplicationsUrl}` : null)
      : `Manually verify planning history at ${lpaApplicationsUrl}`,
    grants: [],
  }
}

function checkCouncilTax(info: CouncilTaxInfo | null, _postcode: string): CheckResult {
  const voaUrl = info?.voaLookupUrl ?? 'https://www.tax.service.gov.uk/check-your-council-tax-band/search'

  if (!info) {
    return {
      id: 'council-tax',
      title: 'Council tax — verify band before purchase',
      status: 'info',
      summary: 'Check your band at voa.gov.uk',
      detail: `Council tax can add £1,200–£4,000+ per year to your ownership costs. Look up the property's exact band on the Valuation Office Agency (VOA) website. Around 400,000 properties in England are believed to be in the wrong band — you can challenge it.`,
      estimatedCostLow: 0, estimatedCostHigh: 0,
      actionRequired: `Check the council tax band: ${voaUrl}`,
      grants: [],
    }
  }

  const bandDRate = info.avgBandDRate
  const bandRates = info.bandRates

  return {
    id: 'council-tax',
    title: `Council tax — ${info.localAuthority}`,
    status: 'info',
    summary: `Average Band D: £${bandDRate?.toLocaleString() ?? '–'}/year — verify the exact band before buying`,
    detail: `In ${info.localAuthority}, the average Band D council tax is approximately £${bandDRate?.toLocaleString() ?? '–'}/year.${bandRates ? ` Estimated annual costs: Band A £${bandRates.A?.toLocaleString()}, Band C £${bandRates.C?.toLocaleString()}, Band E £${bandRates.E?.toLocaleString()}, Band G £${bandRates.G?.toLocaleString()}.` : ''} Look up the exact band on the VOA website — around 400,000 English properties are incorrectly banded. ${info.appealDeadlineNote}`,
    estimatedCostLow: 0, estimatedCostHigh: 0,
    actionRequired: `Look up this property's exact band at ${voaUrl} and compare against neighbours`,
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
  /** Land Registry property type label used to filter comparables, e.g. "Detached", "Flat" */
  comparablePropertyType?: string | null
  crime:       CrimeSummary   | null
  broadband:   BroadbandCoverage | null
  planning:    PlanningSummary   | null
  councilTax:  CouncilTaxInfo    | null
}

export function generateHomebuyerReport(input: HomebuyerCheckInput): HomebuyerReport {
  const { postcode, address, cert, upgradeRecommendations, priceHistory, askingPrice, yearBuilt, comparablePropertyType, crime, broadband, planning, councilTax } = input

  const checks: CheckResult[] = [
    checkEPC(cert, upgradeRecommendations),
    checkPropertyAge(cert, yearBuilt),
    checkBoiler(cert, yearBuilt),
    checkDamp(cert, yearBuilt),
    checkElectrics(yearBuilt),
    checkFloodRisk(),
    checkPriceHistory(priceHistory, askingPrice, comparablePropertyType),
    checkTenure(priceHistory),
    checkCrime(crime),
    checkBroadband(broadband, postcode),
    checkPlanning(planning),
    checkCouncilTax(councilTax, postcode),
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
