/**
 * Council Tax Band Lookup
 *
 * Two-layer approach:
 *  1. Per-property actual band  — via Homedata API (wraps VOA data)
 *     Requires HOMEDATA_API_KEY env var. Free tier: 100 calls/month.
 *     Register at https://homedata.co.uk/register
 *     NOTE: Homedata/VOA only covers England & Wales. Scotland uses SAA.
 *
 *  2. Regional average Band D rates — MHCLG published data (2026-27) for E&W;
 *     per-council 2025/26 rates for Scotland's 32 councils.
 *     Used to calculate approximate annual costs from the band.
 *
 * Users can always verify/challenge at:
 *   England & Wales: https://www.tax.service.gov.uk/check-your-council-tax-band/
 *   Scotland:        https://www.saa.gov.uk/council-tax/council-tax-bands/
 */

import axios from 'axios'
import type { GeocodeResult } from './geocode'

// --- Types -------------------------------------------------------------------

export interface CouncilTaxInfo {
  localAuthority:     string
  voaLookupUrl:       string
  challengeGuideUrl:  string
  /** Actual VOA council tax band for this specific property (A-H), if resolved */
  actualBand:         string | null
  /** Annual cost derived from actualBand x local Band D rate */
  actualAnnualRate:   number | null
  /** Approximate average Band D rate for the region (pounds/year) */
  avgBandDRate:       number | null
  /** Bands A-H approximate annual rates at the regional Band D multiplier */
  bandRates:          Record<string, number> | null
  appealDeadlineNote: string
}

// --- Band D multipliers by band -----------------------------------------------
// Statutory ratios relative to Band D (fixed by law in England and Wales)
const BAND_MULTIPLIERS: Record<string, number> = {
  A: 6/9, B: 7/9, C: 8/9, D: 1, E: 11/9, F: 13/9, G: 15/9, H: 18/9,
}

// --- Regional average Band D rates (pounds/year) ------------------------------
// Source: MHCLG "Council Tax levels set by local authorities in England 2026-27"
// Published: 25 March 2026. England average Band D: 2392 (inc. adult social
// care and parish precepts). Regional figures derived from official area-type
// breakdowns. Precise rates vary significantly between individual councils.
const REGION_AVG_BAND_D: Record<string, number> = {
  'London':                    2068,
  'South East':                2450,
  'South West':                2490,
  'East of England':           2430,
  'East Midlands':             2460,
  'West Midlands':             2380,
  'Yorkshire and The Humber':  2390,
  'North West':                2400,
  'North East':                2480,
  'England':                   2392,
  'Wales':                     2120,
  'Northern Ireland':          0,
}

// --- Scotland per-council Band D rates (pounds/year) -------------------------
// Source: Scottish councils' published 2025/26 Band D rates.
// Keys match the admin_district values returned by postcodes.io.
// SAA (saa.gov.uk) holds the authoritative band data for Scotland.
const SCOTLAND_COUNCIL_BAND_D: Record<string, number> = {
  'Aberdeen City':          1440,
  'Aberdeenshire':          1435,
  'Angus':                  1461,
  'Argyll and Bute':        1515,
  'Clackmannanshire':       1499,
  'Dumfries and Galloway':  1418,
  'Dundee City':            1461,
  'East Ayrshire':          1461,
  'East Dunbartonshire':    1461,
  'East Lothian':           1467,
  'East Renfrewshire':      1461,
  'City of Edinburgh':      1440,
  'Na h-Eileanan Siar':     1261,
  'Falkirk':                1404,
  'Fife':                   1418,
  'Glasgow City':           1499,
  'Highland':               1395,
  'Inverclyde':             1461,
  'Midlothian':             1467,
  'Moray':                  1395,
  'North Ayrshire':         1461,
  'North Lanarkshire':      1499,
  'Orkney Islands':         1261,
  'Perth and Kinross':      1395,
  'Renfrewshire':           1461,
  'Scottish Borders':       1418,
  'Shetland Islands':       1261,
  'South Ayrshire':         1461,
  'South Lanarkshire':      1461,
  'Stirling':               1418,
  'West Dunbartonshire':    1461,
  'West Lothian':           1467,
}

const SCOTLAND_AVG_BAND_D = 1404 // national Scotland average 2025/26

function getAvgBandD(geo: GeocodeResult): number | null {
  // Scotland: use per-council rate (much more accurate than a single national figure)
  if (geo.country?.toLowerCase().includes('scotland')) {
    const district = geo.adminDistrict ?? ''
    return SCOTLAND_COUNCIL_BAND_D[district] ?? SCOTLAND_AVG_BAND_D
  }

  const region = geo.region || geo.country
  for (const [key, value] of Object.entries(REGION_AVG_BAND_D)) {
    if (region.toLowerCase().includes(key.toLowerCase())) return value
  }
  return REGION_AVG_BAND_D['England'] ?? null
}

// --- Building identifier extraction ------------------------------------------

/**
 * Extract the building number or name from a free-text address string.
 * Examples:
 *   "14 High Street"            => { type: 'number', value: '14' }
 *   "14a High Street"           => { type: 'number', value: '14a' }
 *   "Flat 3, 22 Baker Street"   => { type: 'number', value: '22' }
 *   "The Old Barn, Church Road" => { type: 'name',   value: 'The Old Barn' }
 */
function extractBuildingIdentifier(
  address: string
): { type: 'number' | 'name'; value: string } | null {
  const trimmed = address.trim()

  // Leading house number (possibly with flat/unit prefix: "Flat 3, 22 ...")
  const numMatch = trimmed.match(/(?:^|,\s*)(\d+[a-zA-Z]?)[\s,]/)
  if (numMatch) return { type: 'number', value: numMatch[1] }

  // Named building before a comma ("The Old Barn, Church Road")
  const nameMatch = trimmed.match(/^([^,]+),/)
  if (nameMatch) {
    const candidate = nameMatch[1].trim()
    // Only use it if it looks like a name, not just a street
    if (candidate.length > 1 && !/^\d/.test(candidate)) {
      return { type: 'name', value: candidate }
    }
  }

  return null
}

// --- Per-property band lookup (Homedata API => VOA data) ---------------------

/**
 * Look up the actual VOA council tax band by UPRN (fastest path -- cached VOA data).
 * Preferred over address-based lookup when a UPRN is available.
 * Only valid for England & Wales properties.
 */
export async function getCouncilTaxBandByUprn(uprn: number): Promise<string | null> {
  const apiKey = process.env.HOMEDATA_API_KEY
  if (!apiKey || apiKey === 'your_homedata_api_key_here') return null

  try {
    const response = await axios.get(
      'https://api.homedata.co.uk/council_tax_band/',
      {
        params:  { uprn },
        headers: { Authorization: `Api-Key ${apiKey}` },
        timeout: 8000,
      }
    )
    const band = response.data?.council_tax_band
    if (typeof band === 'string' && /^[A-H]$/.test(band)) return band
    return null
  } catch {
    return null
  }
}

/**
 * Look up the actual VOA council tax band by postcode + building identifier.
 * Falls back to a live VOA scrape if not cached. Use getCouncilTaxBandByUprn
 * instead when a UPRN is available.
 * Only valid for England & Wales properties.
 */
export async function getActualCouncilTaxBand(
  postcode: string,
  address:  string
): Promise<string | null> {
  const apiKey = process.env.HOMEDATA_API_KEY
  if (!apiKey || apiKey === 'your_homedata_api_key_here') return null

  const building = extractBuildingIdentifier(address)
  if (!building) return null

  try {
    const params: Record<string, string> = { postcode }
    if (building.type === 'number') {
      params['building_number'] = building.value
    } else {
      params['building_name'] = building.value
    }

    const response = await axios.get(
      'https://api.homedata.co.uk/council_tax_band/',
      {
        params,
        headers: { Authorization: `Api-Key ${apiKey}` },
        timeout: 8000,
      }
    )
    const band = response.data?.council_tax_band
    if (typeof band === 'string' && /^[A-H]$/.test(band)) return band
    return null
  } catch {
    return null
  }
}

// --- Main function -----------------------------------------------------------

export function getCouncilTaxInfo(
  geo:        GeocodeResult,
  actualBand: string | null = null
): CouncilTaxInfo {
  const isScotland = geo.country?.toLowerCase().includes('scotland') ?? false
  const avgBandD   = getAvgBandD(geo)

  const bandRates = avgBandD
    ? Object.fromEntries(
        Object.entries(BAND_MULTIPLIERS).map(([band, ratio]) => [
          band,
          Math.round(avgBandD * ratio),
        ])
      )
    : null

  const actualAnnualRate =
    actualBand && avgBandD
      ? Math.round(avgBandD * (BAND_MULTIPLIERS[actualBand] ?? 1))
      : null

  return {
    localAuthority: geo.adminDistrict || 'your local council',
    voaLookupUrl: isScotland
      ? 'https://www.saa.gov.uk/council-tax/council-tax-bands/'
      : 'https://www.tax.service.gov.uk/check-your-council-tax-band/search',
    challengeGuideUrl: isScotland
      ? 'https://www.saa.gov.uk/council-tax/appeals/'
      : 'https://www.gov.uk/challenge-council-tax-band',
    actualBand,
    actualAnnualRate,
    avgBandDRate: avgBandD,
    bandRates,
    appealDeadlineNote: isScotland
      ? 'In Scotland, you can propose a change to your band at any time via the Scottish Assessors Association (SAA). A successful appeal backdates to when the error began or your purchase date.'
      : 'There is no deadline for proposing a change if you believe the band is wrong -- but act quickly after buying, as a successful appeal will only backdate to your purchase date.',
  }
}
