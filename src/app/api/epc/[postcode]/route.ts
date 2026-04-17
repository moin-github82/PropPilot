/**
 * GET /api/epc/[postcode]?address=...
 *
 * Standalone EPC lookup by postcode + optional address.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  searchByPostcode,
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

  // Check EPC API credentials are configured
  if (!process.env.EPC_API_EMAIL || !process.env.EPC_API_KEY) {
    return NextResponse.json(
      {
        error: 'EPC API not configured',
        hint: 'Add EPC_API_EMAIL and EPC_API_KEY to your .env.local file. Register free at epc.opendatacommunities.org',
      },
      { status: 503 }
    )
  }

  try {
    // Fetch all certificates for this postcode (cached 7 days)
    const records = await withCache(
      CacheKey.epcPostcode(postcode),
      TTL.EPC_POSTCODE,
      () => searchByPostcode(postcode)
    )

    if (!records.length) {
      return NextResponse.json({
        found: false,
        postcode,
        message: 'No EPC certificates found for this postcode. The property may not have been assessed since 2008.',
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

    // No address — return all certificates in this postcode
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
    const isAuthError = message.includes('401') || message.includes('403') || message.includes('Unauthorized')
    const isNetworkError = message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')

    console.error('[EPC API Error]', message)

    if (isAuthError) {
      return NextResponse.json(
        {
          error: 'EPC API authentication failed',
          hint: 'Check EPC_API_EMAIL and EPC_API_KEY in .env.local. Make sure there are no spaces around the values.',
        },
        { status: 401 }
      )
    }

    if (isNetworkError) {
      return NextResponse.json(
        { error: 'Could not reach the EPC Register API. Check your internet connection.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'EPC lookup failed', details: message },
      { status: 500 }
    )
  }
}
