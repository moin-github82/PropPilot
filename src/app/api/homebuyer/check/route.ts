/**
 * POST /api/homebuyer/check
 *
 * Runs all homebuyer due diligence checks for a property.
 *
 * Body:
 * {
 *   postcode:     string   — e.g. "SE15 4NX"
 *   address:      string   — e.g. "42 Peckham Road"
 *   houseNumber:  string   — e.g. "42"
 *   street:       string   — e.g. "Peckham Road"
 *   askingPrice?: number   — optional, enables price comparison
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { searchByPostcode, findBestAddressMatch, getUpgradeRecommendations } from '../../../lib/epc'
import { getPricePaidByPostcode } from '../../../lib/landRegistry'
import { generateHomebuyerReport } from '../../../lib/homebuyerCheck'
import { withCache, CacheKey, TTL } from '../../../lib/cache'

// ─── Request schema ───────────────────────────────────────────────────────────

const RequestSchema = z.object({
  postcode:     z.string().min(5).max(8),
  address:      z.string().min(3).max(200),
  houseNumber:  z.string().min(1).max(20),
  street:       z.string().min(2).max(100),
  askingPrice:  z.number().positive().optional(),
})

// ─── Derive approximate build year from EPC data ──────────────────────────────

function deriveYearBuilt(inspectionDate: string | undefined): number {
  // EPC inspection date is a loose proxy — subtract a generous buffer
  // In production, OS AddressBase or Valuation Office data gives exact build year
  if (!inspectionDate) return 1970 // safe default
  const inspYear = new Date(inspectionDate).getFullYear()
  // Assume average property is ~30 years old at inspection time
  return Math.max(1850, inspYear - 30)
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
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

  const { postcode, address, houseNumber: _hn, street: _st, askingPrice } = parsed.data

  if (!process.env.EPC_API_EMAIL || !process.env.EPC_API_KEY) {
    return NextResponse.json(
      { error: 'EPC API not configured. Add EPC_API_EMAIL and EPC_API_KEY to .env.local' },
      { status: 503 }
    )
  }

  try {
    // Run EPC and price history lookups in parallel
    const [epcRecords, priceHistory] = await Promise.all([
      withCache(
        CacheKey.epcPostcode(postcode),
        TTL.EPC_POSTCODE,
        () => searchByPostcode(postcode)
      ),
      withCache(
        CacheKey.pricePaid(postcode),
        TTL.LAND_REGISTRY,
        () => getPricePaidByPostcode(postcode, 8)
      ),
    ])

    // Match EPC certificate to the specific address
    const match = epcRecords.length > 0
      ? findBestAddressMatch(address, epcRecords)
      : null

    const cert    = match?.record ?? null
    const upgrades = cert ? getUpgradeRecommendations(cert) : []
    const yearBuilt = cert
      ? deriveYearBuilt(cert['inspection-date'])
      : 1970

    // Generate the full report
    const report = generateHomebuyerReport({
      postcode,
      address,
      cert,
      upgradeRecommendations: upgrades,
      priceHistory,
      askingPrice: askingPrice ?? null,
      yearBuilt,
    })

    return NextResponse.json({
      success: true,
      report,
      meta: {
        epcFound:        !!cert,
        epcMatchScore:   match ? Math.round(match.score * 100) : null,
        salesFound:      priceHistory.length,
        checksRun:       report.checks.length,
      },
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Homebuyer Check Error]', message)

    const isAuth = message.includes('401') || message.includes('403')
    if (isAuth) {
      return NextResponse.json(
        { error: 'EPC API authentication failed. Check EPC_API_EMAIL and EPC_API_KEY in .env.local' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Check failed', details: message },
      { status: 500 }
    )
  }
}
