/**
 * GET /api/crime/[postcode]
 * Returns a 3-month crime summary for the area around the postcode.
 */

import { NextRequest, NextResponse } from 'next/server'
import { geocodePostcode } from '../../../lib/geocode'
import { getCrimeData } from '../../../lib/crime'
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

  const geo = await geocodePostcode(postcode)
  if (!geo) {
    return NextResponse.json({ error: 'Could not geocode postcode' }, { status: 404 })
  }

  // Police.uk API only covers England and Wales — Scotland has no equivalent public API
  if (geo.country?.toLowerCase().includes('scotland')) {
    return NextResponse.json(
      {
        error: 'Crime data not available for Scotland',
        message: 'The Police.uk API does not cover Scotland. For local crime statistics, visit your local police force website or Scotland\'s ScotPHO Community Profiles.',
        checkUrl: 'https://www.scotland.police.uk/your-community/',
      },
      { status: 200 }   // 200 so the UI renders the message rather than an error state
    )
  }

  const cacheKey = `crime:${postcode.replace(/\s/g, '').toUpperCase()}`
  const data = await withCache(cacheKey, TTL.LAND_REGISTRY, () => getCrimeData(geo))

  if (!data) {
    return NextResponse.json({ error: 'Crime data unavailable for this area' }, { status: 503 })
  }

  return NextResponse.json(data)
}
