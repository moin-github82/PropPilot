/**
 * PropHealth Niche UK Checks
 *
 * Rules-based risk detection for niche UK property risks that no mainstream
 * portal surfaces. Each function returns a CheckResult compatible with the
 * homebuyer check engine.
 *
 * Data approach: postcode-prefix lookups based on published public-sector
 * datasets (PHE, Coal Authority, ONS). These are indicative risk flags —
 * not a substitute for a professional survey.
 */

import type { CheckResult } from './homebuyerCheck'

// ─── Radon Gas Risk ───────────────────────────────────────────────────────────
// Source: PHE / UKHSA Radon Atlas (indicative areas by outward postcode)
// High-radon areas: SW England, parts of E Midlands, NE England, parts of Scotland

const HIGH_RADON_PREFIXES = new Set([
  // Cornwall & Scilly
  'TR',
  // Devon
  'EX', 'PL', 'TQ',
  // Somerset (Mendip hills area)
  'BA', 'BS',
  // Derbyshire
  'DE', 'SK',
  // Northamptonshire
  'NN',
  // North Yorkshire / Dales
  'DL', 'HG',
  // Aberdeen / NE Scotland
  'AB',
  // Highlands
  'IV', 'KW', 'PH',
])

const ELEVATED_RADON_PREFIXES = new Set([
  // Leicestershire
  'LE',
  // Nottinghamshire
  'NG',
  // Lincolnshire
  'LN', 'PE',
  // Herefordshire
  'HR',
  // Shropshire
  'SY', 'TF',
  // Cumbria
  'CA', 'LA',
  // Parts of South Wales
  'SA', 'CF',
  // Kent (hidden coalfield/chalk)
  'CT', 'ME',
])

export function checkRadon(postcode: string): CheckResult {
  const prefix = postcode.replace(/\s/g, '').slice(0, 2).toUpperCase()
  const isHigh     = HIGH_RADON_PREFIXES.has(prefix)
  const isElevated = !isHigh && ELEVATED_RADON_PREFIXES.has(prefix)

  if (isHigh) {
    return {
      id: 'radon',
      title: 'Radon gas — high-risk area',
      status: 'fail',
      summary: 'This postcode is in a known high-radon zone (PHE data)',
      detail: 'Radon is a naturally occurring radioactive gas that seeps from certain rock types (granite, limestone). It is the second leading cause of lung cancer in the UK after smoking, responsible for ~1,100 deaths per year. Properties in this area have an elevated probability of exceeding the UK Action Level of 200 Bq/m³. Testing is cheap (£40–£50 for a 3-month detector kit) and mitigation systems cost £500–£2,500. The seller should provide a radon test result or you should make one a condition of purchase.',
      estimatedCostLow:  40,
      estimatedCostHigh: 2500,
      actionRequired: 'Commission a radon test (£40–£50 via ukradon.org) before exchange. Budget for a sub-floor depressurisation system if levels exceed 200 Bq/m³.',
      grants: [],
    }
  }

  if (isElevated) {
    return {
      id: 'radon',
      title: 'Radon gas — elevated risk area',
      status: 'warning',
      summary: 'This postcode has above-average radon probability',
      detail: 'PHE data indicates this area has a higher-than-average probability of elevated indoor radon. While not in the highest-risk category, testing is recommended for ground-floor properties, basements, and those with solid floors. A 3-month test kit costs ~£40 and gives a reliable average reading. Mitigation (if needed) runs £500–£1,500.',
      estimatedCostLow:  40,
      estimatedCostHigh: 1500,
      actionRequired: 'Consider a radon test, especially for ground-floor rooms or if the property has a basement or solid concrete floor.',
      grants: [],
    }
  }

  return {
    id: 'radon',
    title: 'Radon gas — standard risk area',
    status: 'pass',
    summary: 'No elevated radon risk identified for this postcode',
    detail: 'This area is not flagged as high-risk in PHE\'s published radon data. Standard building regulations require radon-resistant construction in new builds in at-risk areas. If you have specific concerns, a test kit is available for ~£40.',
    estimatedCostLow:  0,
    estimatedCostHigh: 0,
    actionRequired: null,
    grants: [],
  }
}

// ─── Coal Mining / Subsidence Risk ───────────────────────────────────────────
// Source: Coal Authority published coalfield boundaries (by postcode area)

const COALFIELD_HIGH_RISK = new Set([
  // South Wales coalfield
  'CF', 'NP', 'SA',
  // Yorkshire coalfield
  'WF', 'DN', 'S',
  // Durham / NE England coalfield
  'DH', 'NE', 'SR',
  // East Midlands coalfield (Notts/Derby)
  'NG', 'DE',
  // West Midlands / Black Country
  'WV', 'WS', 'DY', 'B',
  // Lancashire coalfield
  'WN', 'BL', 'BB',
  // Kent coalfield (hidden)
  'CT',
  // Scottish coalfield (Lanarkshire, Fife)
  'ML', 'KY', 'FK',
])

export function checkCoalMining(postcode: string): CheckResult {
  const prefix = postcode.replace(/\s/g, '').slice(0, 2).toUpperCase()
  const inCoalfield = COALFIELD_HIGH_RISK.has(prefix)

  if (inCoalfield) {
    return {
      id: 'coal-mining',
      title: 'Coal mining / subsidence — former coalfield area',
      status: 'warning',
      summary: 'This postcode is in or near a former UK coalfield',
      detail: 'Properties in former coalfield areas can be at risk from mine workings beneath or near the property. Risks include subsidence, ground movement, and in rare cases mineshaft collapse. A Coal Authority search (official conveyancing search, ~£40) will reveal whether the property is in a mining area and whether any workings are recorded directly below. This is a standard search that your solicitor should commission — if they haven\'t mentioned it, ask explicitly.',
      estimatedCostLow:  0,
      estimatedCostHigh: 5000,
      actionRequired: 'Ensure your solicitor commissions a Coal Authority mining search (£40). If workings are found beneath the property, commission a structural engineer\'s report.',
      grants: [],
    }
  }

  return {
    id: 'coal-mining',
    title: 'Coal mining — no coalfield risk identified',
    status: 'pass',
    summary: 'Postcode is not in a known former coalfield area',
    detail: 'This area is not in a known coal or other mining area. Standard subsidence risk applies — which can still exist in areas with shrinkable clay soils (London, Essex, SE England). Your structural survey should assess foundation and subsidence risk.',
    estimatedCostLow:  0,
    estimatedCostHigh: 0,
    actionRequired: null,
    grants: [],
  }
}

// ─── Japanese Knotweed Proximity Risk ────────────────────────────────────────
// Cannot detect actual proximity without a live survey/mapping API.
// We flag high-incidence postcode areas and advise accordingly.

const KNOTWEED_HIGH_INCIDENCE = new Set([
  // South Wales — historically high
  'CF', 'NP', 'SA', 'LD',
  // Thames corridor
  'SL', 'TW', 'UB',
  // Midlands urban cores
  'B', 'WV', 'CV',
  // Bradford/Leeds industrial river valleys
  'BD', 'LS',
  // Bristol / SW urban
  'BS',
])

export function checkJapaneseKnotweed(postcode: string, propertyType: string | null): CheckResult {
  const prefix = postcode.replace(/\s/g, '').slice(0, 2).toUpperCase()
  const highIncidence = KNOTWEED_HIGH_INCIDENCE.has(prefix)

  // Knotweed is most likely near watercourses, railways, former industrial land
  const isHighRisk = highIncidence

  if (isHighRisk) {
    return {
      id: 'knotweed',
      title: 'Japanese knotweed — high-incidence area',
      status: 'warning',
      summary: 'This area has a high recorded incidence of Japanese knotweed',
      detail: 'Japanese knotweed (Fallopia japonica) is an invasive plant that can damage foundations, walls, and drainage. More importantly for buyers: mortgage lenders will refuse to lend on properties within 7 metres of an active knotweed stem, and some lenders apply restrictions up to 25 metres. This area has a above-average incidence. Look for bamboo-like hollow stems (in winter), heart-shaped leaves, or distinctive cream flowers. Ask the seller directly — they are legally obliged to disclose it on the TA6 property information form.',
      estimatedCostLow:  2000,
      estimatedCostHigh: 15000,
      actionRequired: 'Inspect the garden and boundary areas. Ask the seller to confirm knotweed status on form TA6. If present, a professional treatment programme with insurance-backed guarantee is required for mortgage lending.',
      grants: [],
    }
  }

  return {
    id: 'knotweed',
    title: 'Japanese knotweed — standard risk area',
    status: 'info',
    summary: 'No elevated knotweed incidence in this area — but a visual check is still advised',
    detail: 'Knotweed is found throughout the UK and is not limited to high-incidence areas. During viewing, inspect the garden perimeter, any nearby wasteland, railway embankments, or watercourses. In winter it looks like brown hollow canes; in spring/summer it grows up to 3m with distinctive spade-shaped leaves and cream flowers. Ask the seller to confirm on form TA6.',
    estimatedCostLow:  0,
    estimatedCostHigh: 0,
    actionRequired: 'Visually inspect the garden and boundaries during viewing. Confirm knotweed status with seller on form TA6.',
    grants: [],
  }
}

// ─── Ground Rent Escalation Trap ─────────────────────────────────────────────

export interface GroundRentInput {
  tenure: string
  groundRentPerYear: number | null
  escalationType: 'doubling' | 'rpi' | 'fixed' | 'unknown' | null
  doubleEveryYears: number | null   // e.g. 10 (common toxic clause)
  yearBuilt: number | null
}

export function checkGroundRentTrap(input: GroundRentInput): CheckResult {
  const { tenure, groundRentPerYear, escalationType, doubleEveryYears, yearBuilt } = input

  // Not leasehold — no issue
  if (!tenure?.toLowerCase().includes('leasehold')) {
    return {
      id: 'ground-rent',
      title: 'Ground rent — freehold (not applicable)',
      status: 'pass',
      summary: 'Freehold property — no ground rent',
      detail: 'Ground rent is only payable on leasehold properties. Freehold owners have no ground rent liability.',
      estimatedCostLow:  0,
      estimatedCostHigh: 0,
      actionRequired: null,
      grants: [],
    }
  }

  // No ground rent info provided
  if (!groundRentPerYear && escalationType !== 'doubling') {
    return {
      id: 'ground-rent',
      title: 'Ground rent — request full details from seller',
      status: 'warning',
      summary: 'Leasehold property — verify ground rent terms before committing',
      detail: 'For leasehold properties, ground rent is a critical cost. Post-2022 Leasehold Reform Act, new leases cannot charge more than a "peppercorn" (£0). However, legacy leases can have toxic escalation clauses that double every 10 years or link to RPI. A ground rent of £250/year doubling every 10 years becomes £4,000/year after 40 years. Many major lenders will not mortgage properties with ground rents above 0.1% of property value. Request the lease, ground rent amount, and escalation clause from the seller — or the managing agent if already owned.',
      estimatedCostLow:  0,
      estimatedCostHigh: 0,
      actionRequired: 'Request full lease and ground rent schedule from seller. Ask your solicitor to review escalation clauses before exchange.',
      grants: [],
    }
  }

  // Doubling clause — the toxic trap
  if (escalationType === 'doubling') {
    const doubleInterval = doubleEveryYears ?? 10
    const startRent = groundRentPerYear ?? 250
    const rent20 = startRent * Math.pow(2, Math.floor(20 / doubleInterval))
    const rent40 = startRent * Math.pow(2, Math.floor(40 / doubleInterval))

    // Over 0.1% of a typical £300k property = £300/yr
    const isMortgageRisk = groundRentPerYear && groundRentPerYear > 250

    return {
      id: 'ground-rent',
      title: `Ground rent — DOUBLING clause detected (every ${doubleInterval} years)`,
      status: 'fail',
      summary: `Toxic escalation: £${startRent}/yr now → £${Math.round(rent20).toLocaleString()}/yr in 20yrs → £${Math.round(rent40).toLocaleString()}/yr in 40yrs`,
      detail: `This property has a ground rent doubling clause — the most problematic type. Starting at £${startRent}/year, doubling every ${doubleInterval} years produces: £${Math.round(rent20).toLocaleString()}/year in 20 years, and £${Math.round(rent40).toLocaleString()}/year in 40 years. ${isMortgageRisk ? 'The current ground rent may already exceed lender thresholds. ' : ''}MAJOR LENDERS including Halifax, Nationwide, and Barclays will not mortgage properties with doubling ground rent clauses. This makes the property effectively unmortgageable in the future and very difficult to sell. The Leasehold Reform (Ground Rent) Act 2022 only prevents NEW leases from having this clause — existing leases are unaffected.`,
      estimatedCostLow:  5000,
      estimatedCostHigh: 30000,
      actionRequired: 'Do not proceed without: (1) negotiating a deed of variation to convert ground rent to a peppercorn (£0), or (2) discounting the price to account for lease extension cost, or (3) walking away. Instruct a specialist leasehold solicitor.',
      grants: [],
    }
  }

  // RPI-linked — less toxic but still problematic
  if (escalationType === 'rpi') {
    return {
      id: 'ground-rent',
      title: 'Ground rent — RPI-linked escalation',
      status: 'warning',
      summary: `Ground rent of £${groundRentPerYear}/yr linked to RPI — verify mortgage eligibility`,
      detail: `RPI-linked ground rent increases in line with retail price inflation. While less aggressive than a doubling clause, in a high-inflation period (e.g. 2022–23 RPI ran at 12–14%) ground rent can increase rapidly. At 3% average RPI, £${groundRentPerYear}/year becomes £${Math.round((groundRentPerYear ?? 0) * Math.pow(1.03, 20)).toLocaleString()}/year after 20 years. Some lenders treat RPI-linked ground rent as acceptable; others do not. Confirm mortgage eligibility with your lender before proceeding.`,
      estimatedCostLow:  0,
      estimatedCostHigh: 5000,
      actionRequired: 'Confirm with your mortgage lender that they will accept RPI-linked ground rent for this property before exchange.',
      grants: [],
    }
  }

  // Fixed ground rent
  return {
    id: 'ground-rent',
    title: `Ground rent — fixed at £${groundRentPerYear}/year`,
    status: 'pass',
    summary: 'Fixed ground rent — acceptable to most lenders',
    detail: `Fixed ground rent of £${groundRentPerYear}/year. Post-2022 leaseholds must have peppercorn ground rent. Fixed-rate ground rent is acceptable to most major lenders provided it is below 0.1% of property value. Ensure your solicitor confirms the lease contains no escalation clauses.`,
    estimatedCostLow:  0,
    estimatedCostHigh: 0,
    actionRequired: null,
    grants: [],
  }
}

// ─── Cladding / EWS1 Risk ────────────────────────────────────────────────────

export interface CladdingInput {
  propertyType: string | null
  yearBuilt: number | null
  floors: number | null   // estimated storeys
  tenure: string
}

export function checkCladding(input: CladdingInput): CheckResult {
  const { propertyType, yearBuilt, floors, tenure } = input

  const isFlat = propertyType?.toLowerCase().includes('flat')
    || propertyType?.toLowerCase().includes('apartment')
    || propertyType?.toLowerCase().includes('maisonette')

  const isLeasehold = tenure?.toLowerCase().includes('leasehold')

  // Only relevant for flats/apartments
  if (!isFlat) {
    return {
      id: 'cladding',
      title: 'Cladding / EWS1 — not applicable (house)',
      status: 'pass',
      summary: 'Cladding risk only applies to flats and multi-storey buildings',
      detail: 'External Wall System (EWS1) assessments and cladding remediation are only relevant to flats and apartments in multi-storey buildings. This property type does not carry cladding risk.',
      estimatedCostLow:  0,
      estimatedCostHigh: 0,
      actionRequired: null,
      grants: [],
    }
  }

  const builtInRiskEra = yearBuilt && yearBuilt >= 1960 && yearBuilt <= 2010
  const isHighRise = floors && floors >= 11

  if (isHighRise || builtInRiskEra) {
    const severity = isHighRise ? 'fail' : 'warning'

    return {
      id: 'cladding',
      title: isHighRise
        ? 'Cladding / EWS1 — HIGH RISE flat (18m+ risk tier)'
        : 'Cladding / EWS1 — flat built in risk era (1960–2010)',
      status: severity,
      summary: isHighRise
        ? 'Buildings over 18m require an EWS1 form — confirm remediation status before exchange'
        : 'Post-Grenfell cladding checks apply to flats built in this era — verify EWS1 status',
      detail: isHighRise
        ? `This appears to be a high-rise flat (estimated ${floors}+ floors). Post-Grenfell, all buildings over 18m require an EWS1 (External Wall System) form before lenders will mortgage them. As of 2024, the Building Safety Act funds remediation for buildings over 11m. However, the process can take years. CRITICAL questions before proceeding: (1) Does the building have an EWS1 form? (2) If remediation is needed, is the developer/freeholder funding it? (3) Is the leaseholder protected under the Building Safety Act from remediation costs? Without clear answers, mortgage lenders will decline and the property may be unsellable.`
        : `Flats built between 1960 and 2010 may have ACM (aluminium composite material), HPL (high-pressure laminate), or other unsafe cladding — the same materials responsible for the Grenfell Tower fire. The Building Safety Act 2022 provides remediation funding for buildings 11m+, but the process is slow. Before buying: (1) Ask the freeholder/managing agent for an EWS1 form or building safety certificate. (2) Confirm whether any remediation works are planned and who pays. (3) Check if the building is registered on the Building Safety Register.`,
      estimatedCostLow:  0,
      estimatedCostHigh: isHighRise ? 50000 : 15000,
      actionRequired: isHighRise
        ? 'REQUEST: (1) EWS1 form or building safety certificate, (2) Details of any remediation works and funding, (3) Confirmation that leaseholder costs are protected under the Building Safety Act. Do not exchange without these.'
        : 'Ask the freeholder/managing agent: does this building have an EWS1 form? Are any cladding remediation works planned? Check the building is registered at buildingsafety.campaign.gov.uk.',
      grants: ['Building Safety Fund (government — for 11m+ buildings)', 'Developer remediation schemes'],
    }
  }

  return {
    id: 'cladding',
    title: 'Cladding / EWS1 — lower risk (modern or pre-risk-era build)',
    status: 'pass',
    summary: 'Flat appears to be outside the highest-risk build era or height category',
    detail: 'This flat does not appear to fall into the highest-risk category (1960–2010 build, high-rise). However, EWS1 requirements can still apply to buildings over 11m if external wall materials include combustible insulation or timber. Ask the managing agent or freeholder to confirm the building\'s EWS1 status before exchange.',
    estimatedCostLow:  0,
    estimatedCostHigh: 0,
    actionRequired: 'Ask managing agent/freeholder for EWS1 form status as standard due diligence.',
    grants: [],
  }
}

// ─── Mortgage Prisoner Risk ───────────────────────────────────────────────────

export interface MortgagePrisonerInput {
  purchasePrice: number | null
  estimatedValue: number | null
  mortgageBalance: number | null
  mortgageRate: number | null
  mortgageFixEnd: string | null
  purchaseDate: string | null
}

export function checkMortgagePrisoner(input: MortgagePrisonerInput): CheckResult {
  const { purchasePrice, estimatedValue, mortgageBalance, mortgageRate, mortgageFixEnd, purchaseDate } = input

  // Only meaningful if we have rate/fix data
  if (!mortgageRate || !mortgageFixEnd) {
    return {
      id: 'mortgage-prisoner',
      title: 'Mortgage prisoner risk — add mortgage details to assess',
      status: 'info',
      summary: 'Add your mortgage rate and fix end date in the dashboard',
      detail: 'A "mortgage prisoner" is a homeowner who cannot switch to a better deal because their loan-to-value ratio, income changes, or property value falls have locked them out of standard affordability checks — leaving them trapped on their lender\'s higher Standard Variable Rate (SVR). Add your mortgage details to the dashboard for a personalised assessment.',
      estimatedCostLow:  0,
      estimatedCostHigh: 0,
      actionRequired: null,
      grants: [],
    }
  }

  const daysToFix = Math.ceil((new Date(mortgageFixEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const isExpired = daysToFix < 0
  const isExpiringSoon = !isExpired && daysToFix < 90

  // Estimate LTV
  const currentValue = estimatedValue ?? purchasePrice
  const ltv = (mortgageBalance && currentValue)
    ? Math.round((mortgageBalance / currentValue) * 100)
    : null

  const isHighLTV = ltv && ltv > 85
  const isOnHighRate = mortgageRate > 4.5
  const marketRate  = 4.0  // approximate best 5yr fix available in 2025

  if ((isExpired || isExpiringSoon) && isOnHighRate) {
    const overpaymentPerMonth = mortgageBalance
      ? Math.round((mortgageBalance * (mortgageRate - marketRate)) / 100 / 12)
      : null

    return {
      id: 'mortgage-prisoner',
      title: `Mortgage prisoner risk — ${isExpired ? 'expired' : 'expiring soon'}, rate ${mortgageRate}%`,
      status: isExpired ? 'fail' : 'warning',
      summary: isExpired
        ? `Fix expired — you may be on SVR. Estimated overpayment: ${overpaymentPerMonth ? `£${overpaymentPerMonth.toLocaleString()}/month vs market rates` : 'calculate below'}`
        : `Fix expires in ${daysToFix} days — act now to avoid SVR`,
      detail: `${isExpired ? 'Your fixed rate has expired.' : `Your fixed rate expires in ${daysToFix} days.`} The average SVR in 2025 is ~${(marketRate + 2.5).toFixed(1)}% — ${(mortgageRate + 2.5 - marketRate).toFixed(1)} percentage points above best available fixed rates. ${overpaymentPerMonth ? `At your current balance, switching could save approximately £${overpaymentPerMonth.toLocaleString()}/month (£${(overpaymentPerMonth * 12).toLocaleString()}/year). ` : ''}${isHighLTV ? `Note: your LTV of ~${ltv}% may limit your choice of deals. ` : ''}Use a mortgage broker (most are fee-free to buyers, paid by lenders) to compare deals across the whole market.`,
      estimatedCostLow:  0,
      estimatedCostHigh: overpaymentPerMonth ? overpaymentPerMonth * 24 : 5000,
      actionRequired: isExpired
        ? 'Contact a fee-free mortgage broker immediately (e.g. L&C, Habito, Trussle). You are almost certainly overpaying.'
        : 'Start comparing mortgage deals now — it takes 3–6 weeks to complete a switch and you can often lock in a rate 6 months early.',
      grants: [],
    }
  }

  return {
    id: 'mortgage-prisoner',
    title: `Mortgage — ${isExpired ? 'expired' : `fix ends ${daysToFix < 365 ? `in ${daysToFix} days` : `${new Date(mortgageFixEnd).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`}`}`,
    status: 'pass',
    summary: isExpired ? 'Fix expired — worth reviewing your rate' : 'Fix still active — set a reminder to review 6 months before expiry',
    detail: 'Your fixed rate appears to be active and/or at a reasonable level. Set a reminder 6 months before your fix end date to start comparing deals — you can usually lock in a new rate before your current deal ends without paying early repayment charges.',
    estimatedCostLow:  0,
    estimatedCostHigh: 0,
    actionRequired: !isExpired && daysToFix < 180
      ? 'Start comparing deals now — fix expires within 6 months'
      : null,
    grants: [],
  }
}

// ─── Permitted Development Potential ─────────────────────────────────────────

export interface PDRInput {
  propertyType: string | null
  yearBuilt: number | null
  inConservationArea: boolean
  articleFourDirection: boolean
  isListedBuilding: boolean
  isFlat: boolean
}

export function checkPermittedDevelopment(input: PDRInput): CheckResult {
  const { propertyType, inConservationArea, articleFourDirection, isListedBuilding, isFlat } = input

  if (isFlat) {
    return {
      id: 'permitted-development',
      title: 'Permitted development — flats have no PD rights',
      status: 'info',
      summary: 'Flats and maisonettes have no permitted development rights',
      detail: 'Permitted development rights (which allow certain works without planning permission) do not apply to flats or maisonettes. Any external alteration, extension, or conversion requires full planning permission from the local authority. Internal alterations may also need Listed Building Consent if applicable.',
      estimatedCostLow:  0,
      estimatedCostHigh: 0,
      actionRequired: 'Any external works will require full planning permission — factor this into any renovation plans.',
      grants: [],
    }
  }

  if (isListedBuilding) {
    return {
      id: 'permitted-development',
      title: 'Permitted development — listed building (no PD rights)',
      status: 'fail',
      summary: 'Listed buildings have no permitted development rights — all works need consent',
      detail: 'Listed buildings are exempt from permitted development rights. Any works to the structure, interior, or curtilage — including routine replacements — require Listed Building Consent. Unauthorised works are a criminal offence with no statute of limitations. The cost and complexity of obtaining consent varies significantly.',
      estimatedCostLow:  0,
      estimatedCostHigh: 0,
      actionRequired: 'Budget for specialist heritage advice before any works. Never assume a repair is "like-for-like" without checking with the LPA.',
      grants: [],
    }
  }

  if (inConservationArea && articleFourDirection) {
    return {
      id: 'permitted-development',
      title: 'Permitted development — conservation area + Article 4 (severely restricted)',
      status: 'warning',
      summary: 'PD rights significantly restricted — most external works need planning permission',
      detail: 'This property is in a conservation area AND subject to an Article 4 Direction, which together restrict almost all permitted development. Extensions, loft conversions, replacement windows, solar panels, and external changes typically require planning permission. Refusals are more common in conservation areas. Factor in planning costs (£250–£500 per application) and longer timescales for any works.',
      estimatedCostLow:  0,
      estimatedCostHigh: 0,
      actionRequired: 'Check the local authority planning portal for approved precedent works on similar properties in this conservation area before committing to renovation plans.',
      grants: [],
    }
  }

  if (inConservationArea || articleFourDirection) {
    return {
      id: 'permitted-development',
      title: 'Permitted development — restricted (conservation area or Article 4)',
      status: 'warning',
      summary: 'Some PD rights are restricted — verify with local authority before planning works',
      detail: `${inConservationArea ? 'Conservation area status restricts cladding, demolition, and some extensions.' : ''} ${articleFourDirection ? 'An Article 4 Direction removes specific permitted development rights — confirm the scope with the LPA.' : ''} Standard extensions, loft conversions, and outbuildings may still be possible with planning permission, but permitted development shortcuts are unavailable or restricted.`,
      estimatedCostLow:  0,
      estimatedCostHigh: 0,
      actionRequired: 'Before any works, contact the LPA\'s planning helpdesk to confirm what requires permission and what doesn\'t under the current restrictions.',
      grants: [],
    }
  }

  return {
    id: 'permitted-development',
    title: 'Permitted development — full PD rights apply',
    status: 'pass',
    summary: 'Standard permitted development rights — extensions and loft conversions may not need planning permission',
    detail: 'This property appears to have standard permitted development rights. Under Class A (extensions) and Class B (loft conversions) of the GPDO 2015, you may be able to extend and convert the loft without full planning permission — subject to size limits. Single-storey rear extensions up to 4m (detached) or 3m (semi/terrace) are typically permitted. A Lawful Development Certificate (£103–£206) confirms permitted development without formal permission.',
    estimatedCostLow:  0,
    estimatedCostHigh: 0,
    actionRequired: null,
    grants: [],
  }
}
