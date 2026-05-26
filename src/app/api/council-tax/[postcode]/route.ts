/**
 * GET /api/council-tax/[postcode]?uprn=...  (preferred — UPRN path)
 * GET /api/council-tax/[postcode]?address=... (fallback — text parse)
 *
 * Returns council tax info for the postcode area, plus the actual VOA band
 * for the specific property if a UPRN or address is supplied.
 */

import { NextRequest, NextResponse } from 'next/server'
import { geocodePostcode } from '../../../lib/geocode'
import {
  getCouncilTaxInfo,
  getCouncilTaxBandByUprn,
  getActualCouncilTaxBand,
} from '../../../lib/councilTax'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postcode: string }> }
) {
  const { postcode: raw } = await params
  const postcode = decodeURIComponent(raw)
  const uprn     = req.nextUrl.searchParams.get('uprn')
  const address  = req.nextUrl.searchParams.get('address') ?? ''

  if (!postcode || postcode.length < 5) {
    return NextResponse.json({ error: 'Valid UK postcode required' }, { status: 400 })
  }

  const geo = await geocodePostcode(postcode)
  if (!geo) {
    return NextResponse.json({ error: 'Could not geocode postcode' }, { status: 404 })
  }

  // UPRN path is fastest (hits cached VOA data); address path falls back to live scrape
  const actualBand = uprn
    ? await getCouncilTaxBandByUprn(Number(uprn))
    : address
    ? await getActualCouncilTaxBand(postcode, address)
    : null

  const info = getCouncilTaxInfo(geo, actualBand)
  return NextResponse.json(info)
}
