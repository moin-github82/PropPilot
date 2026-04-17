/**
 * GET /api/crime/[postcode]
 * Returns a 3-month crime summary for the area around the postcode.
 */

import { NextRequest, NextResponse } from 'next/server'
import { geocodePostcode } from '../../../lib/geocode'
import { getCrimeData } from '../../../lib/crime'
import { withCache, CacheKey, TTL } from '../../../lib/cache'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ postcode: string }> }
) {
  const { postcode: raw } = await params
  const postcode = decodeURIComponent(raw)

  if (!postcode || postcode.length < 5) {
    return NextResponse.json({ error: 'Valid UK postcode required' }, { status: 400 })
  }

  const geo = await geocodePostcode(postcode)
  if (!geo) {
    return NextResponse.json({ error: 'Could not geocode postcode' }, { status: 404 })
  }

  const cacheKey = `crime:${postcode.replace(/\s/g, '').toUpperCase()}`
  const data = await withCache(cacheKey, TTL.LAND_REGISTRY, () => getCrimeData(geo))

  if (!data) {
    return NextResponse.json({ error: 'Crime data unavailable for this area' }, { status: 503 })
  }

  return NextResponse.json(data)
}
