/**
 * POST /api/property/lookup
 *
 * Unified property lookup — calls EPC, Land Registry, and
 * maintenance engine in parallel and returns a combined result.
 *
 * Body: { postcode: string, address: string, houseNumber?: string, street?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getPropertyEPC } from '../../../lib/epc'
import { getPropertyValuation } from '../../../lib/landRegistry'
import { generateMaintenanceReport } from '../../../lib/maintenance'
import { withCache, CacheKey, TTL } from '../../../lib/cache'

// ─── Request schema ───────────────────────────────────────────────────────────

const RequestSchema = z.object({
  postcode:    z.string().min(5).max(8),
  address:     z.string().min(3).max(200),
  houseNumber: z.string().optional(),
  street:      z.string().optional(),
})

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Parse and validate body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { postcode, address, houseNumber, street } = parsed.data

  // 2. Run EPC and valuation lookups in parallel
  const [epcResult, valuation] = await Promise.allSettled([
    withCache(
      CacheKey.epcPostcode(postcode),
      TTL.EPC_POSTCODE,
      () => getPropertyEPC(postcode, address)
    ),
    houseNumber && street
      ? withCache(
          CacheKey.valuation(postcode, houseNumber),
          TTL.VALUATION,
          () => getPropertyValuation(postcode, houseNumber, street)
        )
      : Promise.resolve(null),
  ])

  const epc        = epcResult.status === 'fulfilled'  ? epcResult.value   : null
  const valuationData = valuation.status === 'fulfilled' ? valuation.value : null

  // 3. Generate maintenance predictions if we have EPC data
  let maintenanceReport = null
  if (epc?.certificate) {
    // Derive approximate build year from EPC inspection date
    const inspectionYear = new Date(epc.certificate['inspection-date']).getFullYear()
    // Use inspection year as a proxy — ideally ask the user directly
    const buildYear = inspectionYear - 20 // conservative default
    maintenanceReport = generateMaintenanceReport(epc.certificate, buildYear)
  }

  // 4. Return combined result
  return NextResponse.json({
    postcode,
    address,
    epc: epc
      ? {
          currentBand:         epc.certificate['current-energy-rating'],
          potentialBand:       epc.certificate['potential-energy-rating'],
          currentScore:        epc.certificate['current-energy-efficiency'],
          potentialScore:      epc.certificate['potential-energy-efficiency'],
          lodgementDate:       epc.certificate['lodgement-date'],
          propertyType:        epc.certificate['property-type'],
          builtForm:           epc.certificate['built-form'],
          totalFloorArea:      epc.certificate['total-floor-area'],
          upgradeRecommendations: epc.upgradeRecommendations,
          isStaleCertificate:  epc.isStaleCertificate,
          yearsOld:            epc.yearsOld,
          matchConfidence:     epc.matchConfidence,
        }
      : null,
    valuation: valuationData
      ? {
          estimatedValue:       valuationData.estimatedValue,
          estimatedValueLow:    valuationData.estimatedValueLow,
          estimatedValueHigh:   valuationData.estimatedValueHigh,
          lastSalePrice:        valuationData.lastSalePrice,
          lastSaleDate:         valuationData.lastSaleDate,
          growthSinceLastSale:  valuationData.growthSinceLastSale,
          recentSales:          valuationData.priceHistory.slice(0, 5),
        }
      : null,
    maintenance: maintenanceReport,
  })
}
