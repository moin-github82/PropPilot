/**
 * GET /api/epc/[postcode]?address=...&uprn=...
 *
 * EPC lookup by postcode + optional address/UPRN.
 *
 * Data sources (tried in order):
 *   1. Homedata /epc-checker/{uprn}/ — when ?uprn= is provided and HOMEDATA_API_KEY is set
 *   2. New EPC government API — when EPC_BEARER_TOKEN is configured
 *   3. Migration message — when neither is available
 *
 * NOTE: The old epc.opendatacommunities.org API was retired on 30 May 2026.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  searchByPostcode,
  isScottishPostcode,
  findBestAddressMatch,
  getUpgradeRecommendations,
  getCertificateAgeYears,
  hasNewEpcToken,
} from '../../../lib/epc'
import { withCache, CacheKey, TTL } from '../../../lib/cache'

const MIGRATION_NOTE =
  'The EPC Open Data API was retired on 30 May 2026. ' +
  'To restore EPC lookups, register at https://get-energy-performance-data.communities.gov.uk ' +
  '(GOV.UK One Login required), then add EPC_BEARER_TOKEN=<token> to your .env.local file.'

/** Maps an EPC efficiency score (1–100) to a band letter A–G. */
function scoreToBand(score: number): string {
  if (score >= 92) return 'A'
  if (score >= 81) return 'B'
  if (score >= 69) return 'C'
  if (score >= 55) return 'D'
  if (score >= 39) return 'E'
  if (score >= 21) return 'F'
  return 'G'
}

/**
 * Fetch EPC data from Homedata /epc-checker/{uprn}/ and return in our
 * standard EpcResult shape. Returns null if the key is missing or call fails.
 */
async function getEpcFromHomedata(uprn: number, address: string) {
  const apiKey = process.env.HOMEDATA_API_KEY
  if (!apiKey || apiKey === 'your_homedata_api_key_here') return null

  try {
    const res = await fetch(
      `https://api.homedata.co.uk/epc-checker/${uprn}/`,
      {
        headers: { Authorization: `Api-Key ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return null
    const d = await res.json()

    const currentScore   = typeof d.current_energy_efficiency   === 'number' ? d.current_energy_efficiency   : null
    const potentialScore = typeof d.potential_energy_efficiency === 'number' ? d.potential_energy_efficiency : null
    if (currentScore === null) return null

    const currentBand   = scoreToBand(currentScore)
    const potentialBand = potentialScore !== null ? scoreToBand(potentialScore) : currentBand

    const lodgementDate: string = d.last_epc_date ?? ''
    const yearsOld = lodgementDate
      ? Math.floor((Date.now() - new Date(lodgementDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : 0

    return {
      found: true,
      source: 'homedata',
      certificate: {
        address,
        currentBand,
        potentialBand,
        currentScore,
        potentialScore: potentialScore ?? currentScore,
        propertyType:   d.construction_age_band ? `Built ${d.construction_age_band}` : 'Residential',
        lodgementDate,
        totalFloorArea: d.epc_floor_area ?? null,
        mainFuel:       'See full EPC certificate',
        yearsOld,
        isStale:        yearsOld > 10,
      },
      upgradeRecommendations: [],
    }
  } catch {
    return null
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postcode: string }> }
) {
  const { postcode: rawPostcode } = await params
  const postcode = decodeURIComponent(rawPostcode).replace(/\s/g, '').toUpperCase()
  const address  = req.nextUrl.searchParams.get('address') ?? ''
  const uprnStr  = req.nextUrl.searchParams.get('uprn') ?? ''
  const uprn     = uprnStr ? parseInt(uprnStr, 10) : null

  if (!postcode || postcode.length < 5) {
    return NextResponse.json(
      { error: 'Valid UK postcode required (e.g. SW1A2AA or SW1A+2AA)' },
      { status: 400 }
    )
  }

  // ── Fast path: Homedata EPC (when UPRN is provided + API key is configured) ──
  if (uprn && !isNaN(uprn)) {
    const homedataResult = await getEpcFromHomedata(uprn, address || `UPRN ${uprn}`)
    if (homedataResult) {
      return NextResponse.json(homedataResult)
    }
    // Homedata failed (bad key / not found) — fall through to government API
  }

  // For Scottish postcodes, require the Scotland key
  const isScotland = isScottishPostcode(postcode)
  if (isScotland) {
    const scotKey = process.env.EPC_SCOTLAND_API_KEY
    if (!scotKey || scotKey === 'your_scotland_epc_api_key_here') {
      return NextResponse.json(
        {
          found: false,
          postcode,
          message: 'Scottish EPC data requires a separate API key from epcdata.scot (free). Add EPC_SCOTLAND_API_KEY to your .env.local file.',
          setupUrl: 'https://epcdata.scot/api-key',
        },
        { status: 200 }
      )
    }
  }

  // Check E&W EPC credentials (not needed for Scotland)
  if (!isScotland && !hasNewEpcToken()) {
    const hasOldCreds = !!(process.env.EPC_API_EMAIL && process.env.EPC_API_KEY)
    return NextResponse.json(
      {
        found: false,
        apiRetired: true,
        message: hasOldCreds
          ? 'EPC API migration required: the old epc.opendatacommunities.org service was retired on 30 May 2026. ' +
            'Register at https://get-energy-performance-data.communities.gov.uk (GOV.UK One Login), ' +
            'get your Bearer token, and add EPC_BEARER_TOKEN=<token> to .env.local.'
          : 'EPC API not configured. Register at https://get-energy-performance-data.communities.gov.uk ' +
            '(GOV.UK One Login required) and add EPC_BEARER_TOKEN=<token> to .env.local.',
      },
      { status: 200 }
    )
  }

  try {
    const cacheKey = isScotland
      ? `SCO:${CacheKey.epcPostcode(postcode)}`
      : CacheKey.epcPostcode(postcode)
    const records = await withCache(
      cacheKey,
      TTL.EPC_POSTCODE,
      () => searchByPostcode(postcode)
    )

    if (!records.length) {
      return NextResponse.json({
        found: false,
        postcode,
        message: isScotland
          ? 'No EPC certificates found in the Scottish register for this postcode. The property may not have been assessed, or the certificate may have expired.'
          : 'No EPC certificates found for this postcode. The property may not have been assessed since 2008.',
      })
    }

    if (address) {
      const match = findBestAddressMatch(address, records)
      if (!match) {
        return NextResponse.json({
          found: false,
          postcode,
          message: 'No certificate matched this address. Try a shorter address (e.g. just the house number and street).',
          allInPostcode: records.map(r => ({
            address:  r.address,
            band:     r['current-energy-rating'],
            date:     r['lodgement-date'],
          })),
        })
      }

      const { record, score } = match
      return NextResponse.json({
        found: true,
        matchConfidence: Math.round(score * 100) / 100,
        certificate: {
          lmkKey:         record['lmk-key'],
          address:        record.address,
          postcode:       record.postcode,
          currentBand:    record['current-energy-rating'],
          potentialBand:  record['potential-energy-rating'],
          currentScore:   record['current-energy-efficiency'],
          potentialScore: record['potential-energy-efficiency'],
          propertyType:   record['property-type'],
          builtForm:      record['built-form'],
          lodgementDate:  record['lodgement-date'],
          totalFloorArea: record['total-floor-area'],
          mainFuel:       record['main-fuel'],
          yearsOld:       getCertificateAgeYears(record),
          isStale:        getCertificateAgeYears(record) > 10,
        },
        upgradeRecommendations: getUpgradeRecommendations(record),
      })
    }

    return NextResponse.json({
      found: true,
      postcode,
      count: records.length,
      certificates: records.map(r => ({
        lmkKey:        r['lmk-key'],
        address:       r.address,
        currentBand:   r['current-energy-rating'],
        lodgementDate: r['lodgement-date'],
      })),
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const isAuthError    = message.includes('401') || message.includes('403') || message.includes('Unauthorized')
    const isNetworkError = message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')
    const isTimeout      = message.includes('ETIMEDOUT') || message.includes('timeout') || message.includes('ECONNRESET')

    console.error('[EPC API Error]', message)

    if (isAuthError) {
      return NextResponse.json(
        {
          found: false,
          apiRetired: true,
          message: isScotland
            ? 'Scottish EPC API key rejected -- check EPC_SCOTLAND_API_KEY in .env.local.'
            : `EPC API authentication failed. ${MIGRATION_NOTE}`,
        },
        { status: 200 }
      )
    }

    if (isTimeout) {
      return NextResponse.json(
        { found: false, message: 'EPC Register API timed out. Try again in a moment.' },
        { status: 200 }
      )
    }

    if (isNetworkError) {
      return NextResponse.json(
        { found: false, message: 'Could not reach the EPC Register API. Check your internet connection.' },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { found: false, message: `EPC lookup failed: ${message}` },
      { status: 200 }
    )
  }
}
