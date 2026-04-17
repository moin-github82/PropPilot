/**
 * GET /api/broadband/[postcode]
 * Returns Ofcom broadband coverage for the postcode.
 * Returns 503 with a helpful message if Ofcom credentials are not configured.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getBroadbandCoverage, isOfcomConfigured } from '../../../lib/broadband'
import { withCache, TTL } from '../../../lib/cache'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ postcode: string }> }
) {
  const { postcode: raw } = await params
  const postcode = decodeURIComponent(raw)

  if (!postcode || postcode.length < 5) {
    return NextResponse.json({ error: 'Valid UK postcode required' }, { status: 400 })
  }

  if (!isOfcomConfigured()) {
    return NextResponse.json({
      configured: false,
      message:    'Ofcom API not configured. Add OFCOM_SUBSCRIPTION_KEY to .env.local (find it at api.ofcom.org.uk → Profile → Subscriptions).',
      checkUrl:   `https://checker.ofcom.org.uk/en-gb/broadband-coverage?postcode=${encodeURIComponent(postcode)}`,
    }, { status: 503 })
  }

  const cacheKey = `broadband:${postcode.replace(/\s/g, '').toUpperCase()}`
  const data = await withCache(cacheKey, TTL.EPC_POSTCODE, () => getBroadbandCoverage(postcode))

  if (!data) {
    return NextResponse.json({
      configured: true,
      error:      'Broadband data unavailable for this postcode',
      checkUrl:   `https://checker.ofcom.org.uk/en-gb/broadband-coverage?postcode=${encodeURIComponent(postcode)}`,
    }, { status: 503 })
  }

  return NextResponse.json({ configured: true, ...data })
}
