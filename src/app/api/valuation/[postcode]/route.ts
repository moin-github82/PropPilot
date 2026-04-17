/**
 * GET /api/valuation/[postcode]?houseNumber=...&street=...
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPropertyValuation, getPricePaidByPostcode } from '../../../lib/landRegistry'
import { withCache, CacheKey, TTL } from '../../../lib/cache'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postcode: string }> }
) {
  const { postcode: rawPostcode } = await params
  const postcode    = decodeURIComponent(rawPostcode)
  const houseNumber = req.nextUrl.searchParams.get('houseNumber') ?? ''
  const street      = req.nextUrl.searchParams.get('street') ?? ''

  if (!postcode || postcode.length < 5) {
    return NextResponse.json({ error: 'Valid UK postcode required' }, { status: 400 })
  }

  // Specific property valuation
  if (houseNumber && street) {
    const valuation = await withCache(
      CacheKey.valuation(postcode, houseNumber),
      TTL.VALUATION,
      () => getPropertyValuation(postcode, houseNumber, street)
    )
    return NextResponse.json(valuation)
  }

  // Postcode-level recent sales (for nearby comparables)
  const recentSales = await withCache(
    CacheKey.pricePaid(postcode),
    TTL.LAND_REGISTRY,
    () => getPricePaidByPostcode(postcode, 10)
  )

  return NextResponse.json({
    postcode,
    recentSales: recentSales.map(s => ({
      price:        s.price,
      date:         s.date,
      address:      `${s.address.paon} ${s.address.street}`,
      propertyType: s.propertyType,
      tenure:       s.estateTenure,
      newBuild:     s.newBuild,
    })),
  })
}
