/**
 * GET /api/council-tax/[postcode]
 * Returns council tax band rates and VOA lookup link for the postcode area.
 */

import { NextRequest, NextResponse } from 'next/server'
import { geocodePostcode } from '../../../lib/geocode'
import { getCouncilTaxInfo } from '../../../lib/councilTax'

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

  const info = getCouncilTaxInfo(geo)
  return NextResponse.json(info)
}
