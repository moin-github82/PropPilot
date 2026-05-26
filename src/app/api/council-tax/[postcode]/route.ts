/**
 * GET /api/council-tax/[postcode]?address=...
 *
 * Returns council tax info for a postcode area.
 * If ?address is also supplied, attempts to resolve the actual VOA band
 * for that specific property via the Homedata API.
 */

import { NextRequest, NextResponse } from 'next/server'
import { geocodePostcode } from '../../../lib/geocode'
import { getCouncilTaxInfo, getActualCouncilTaxBand } from '../../../lib/councilTax'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postcode: string }> }
) {
  const { postcode: raw } = await params
  const postcode = decodeURIComponent(raw)
  const address  = req.nextUrl.searchParams.get('address') ?? ''

  if (!postcode || postcode.length < 5) {
    return NextResponse.json({ error: 'Valid UK postcode required' }, { status: 400 })
  }

  const geo = await geocodePostcode(postcode)
  if (!geo) {
    return NextResponse.json({ error: 'Could not geocode postcode' }, { status: 404 })
  }

  // Attempt per-property band lookup in parallel with geocode (already done above)
  const actualBand = address ? await getActualCouncilTaxBand(postcode, address) : null

  const info = getCouncilTaxInfo(geo, actualBand)
  return NextResponse.json(info)
}
