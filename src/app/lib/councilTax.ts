/**
 * Council Tax Band Lookup
 *
 * There is no single public JSON API for real-time council tax band lookup.
 * This module derives the local authority from geocode data and provides:
 *  - The VOA direct link to check and challenge the band
 *  - Average council tax rates for the district (from ONS published data)
 *  - Guidance on what to look for and how to appeal
 *
 * Real-time per-address band lookup requires the VOA's internal systems.
 * Users should verify at: https://www.tax.service.gov.uk/check-your-council-tax-band/
 */

import type { GeocodeResult } from './geocode'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CouncilTaxInfo {
  localAuthority:     string
  voaLookupUrl:       string
  challengeGuideUrl:  string
  /** Approximate average Band D rate for the LA (£/year) — from ONS data */
  avgBandDRate:       number | null
  /** Bands A–H approximate annual rates at the LA's Band D multiplier */
  bandRates:          Record<string, number> | null
  appealDeadlineNote: string
}

// ─── Band D multipliers by band ───────────────────────────────────────────────
// Statutory ratios relative to Band D (fixed by law)
const BAND_MULTIPLIERS: Record<string, number> = {
  A: 6/9, B: 7/9, C: 8/9, D: 1, E: 11/9, F: 13/9, G: 15/9, H: 18/9,
}

// ─── Approximate average Band D rates (£/year) for broad regions ──────────────
// Source: DLUHC Council Tax levels set by local authorities 2023-24
// This is a coarse lookup by region — precise rates vary by authority
const REGION_AVG_BAND_D: Record<string, number> = {
  'London':                    1695,
  'South East':                2085,
  'South West':                2121,
  'East of England':           1989,
  'East Midlands':             2077,
  'West Midlands':             1989,
  'Yorkshire and The Humber':  2025,
  'North West':                2094,
  'North East':                2128,
  'England':                   2065,
  'Wales':                     1832,
  'Scotland':                  1347,
  'Northern Ireland':          0,    // NI uses domestic rates, not council tax
}

function getAvgBandD(geo: GeocodeResult): number | null {
  const region = geo.region || geo.country
  for (const [key, value] of Object.entries(REGION_AVG_BAND_D)) {
    if (region.toLowerCase().includes(key.toLowerCase())) return value
  }
  return REGION_AVG_BAND_D['England'] ?? null
}

// ─── Main function ────────────────────────────────────────────────────────────

export function getCouncilTaxInfo(geo: GeocodeResult): CouncilTaxInfo {
  const avgBandD = getAvgBandD(geo)

  const bandRates = avgBandD
    ? Object.fromEntries(
        Object.entries(BAND_MULTIPLIERS).map(([band, ratio]) => [
          band,
          Math.round(avgBandD * ratio),
        ])
      )
    : null

  const voaLookupUrl = 'https://www.tax.service.gov.uk/check-your-council-tax-band/search'

  return {
    localAuthority:    geo.adminDistrict || 'your local council',
    voaLookupUrl,
    challengeGuideUrl: 'https://www.gov.uk/challenge-council-tax-band',
    avgBandDRate:      avgBandD,
    bandRates,
    appealDeadlineNote:
      'There is no deadline for proposing a change if you believe the band is wrong — but act quickly after buying, as a successful appeal will only backdate to your purchase date.',
  }
}
