/**
 * GET /api/epc/[postcode]?address=...
 *
 * Standalone EPC lookup by postcode + optional address.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  searchByPostcode,
  isScottishPostcode,
  findBestAddressMatch,
  getUpgradeRecommendations,
  getCertificateAgeYears,
} from '../../../lib/epc'
import { withCache, CacheKey, TTL } from '../../../lib/cache'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postcode: string }> }
) {
  const { postcode: rawPostcode } = await params
  const postcode = decodeURIComponent(rawPostcode).replace(/\s/g, '').toUpperCase()
  const address  = req.nextUrl.searchParams.get('address') ?? ''

  if (!postcode || postcode.length < 5) {
    return NextResponse.json(
      { error: 'Valid UK postcode required (e.g. SW1A2AA or SW1A+2AA)' },
      { status: 400 }
    )
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

  // Check E&W EPC API credentials (not needed for Scotland)
  if (!isScotland && (!process.env.EPC_API_EMAIL || !process.env.EPC_API_KEY)) {
    return NextResponse.json(
      {
        found: false,
        message: 'EPC API not configured. Add EPC_API_EMAIL and EPC_API_KEY to your .env.local file. Register free at epc.opendatacommunities.org',
      },
      { status: 200 }
    )
  }

  try {
    // Fetch all certificates for this postcode (cached 7 days).
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

    // If address provided, find best match
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

    // No address -- return all certificates in this postcode
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
          error: 'EPC API authentication failed',
          message: isScotland
            ? 'Scottish EPC API key rejected -- check EPC_SCOTLAND_API_KEY in .env.local.'
            : 'EPC API credentials rejected -- check EPC_API_EMAIL and EPC_API_KEY in .env.local.',
        },
        { status: 200 }
      )
    }

    if (isTimeout) {
      return NextResponse.json(
        {
          found: false,
          message: 'EPC Register API timed out. The service may be temporarily slow -- try again in a moment.',
        },
        { status: 200 }
      )
    }

    if (isNetworkError) {
      return NextResponse.json(
        {
          found: false,
          message: 'Could not reach the EPC Register API. Check your internet connection.',
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        found: false,
        message: `EPC lookup failed: ${message}`,
      },
      { status: 200 }
    )
  }
}
