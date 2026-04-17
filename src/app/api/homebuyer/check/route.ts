/**
 * POST /api/homebuyer/check
 *
 * Runs all homebuyer due diligence checks.
 * Each data source is isolated — if one fails, the rest still run.
 *
 * Body: { postcode, address, houseNumber, street, askingPrice? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  searchByPostcode,
  findBestAddressMatch,
  getUpgradeRecommendations,
} from '../../../lib/epc'
import { getPricePaidByPostcode } from '../../../lib/landRegistry'
import { generateHomebuyerReport } from '../../../lib/homebuyerCheck'
import { withCache, CacheKey, TTL } from '../../../lib/cache'
import type { EPCCertificate, UpgradeRecommendation } from '../../../lib/epc'
import type { PricePaidRecord } from '../../../lib/landRegistry'

// ─── Property type helpers ────────────────────────────────────────────────────

/**
 * Derive a Land Registry property type label from EPC certificate fields.
 * EPC `property-type`: Flat | Maisonette | House | Bungalow | Park home
 * EPC `built-form`:    Detached | Semi-Detached | End-Terrace | Mid-Terrace | Enclosed …
 */
function derivePropertyTypeFilter(cert: EPCCertificate | null): string | null {
  if (!cert) return null
  const propType  = (cert['property-type'] ?? '').toLowerCase()
  const builtForm = (cert['built-form']    ?? '').toLowerCase()

  if (propType === 'flat' || propType === 'maisonette') return 'Flat'
  if (builtForm.includes('semi'))                       return 'Semi-Detached'
  if (builtForm.includes('detached'))                   return 'Detached'
  if (builtForm.includes('terrace'))                    return 'Terraced'
  return null
}

/**
 * Filter price-paid records to only those matching the derived property type.
 * Falls back to the full set if fewer than 2 same-type sales exist (thin market).
 * Land Registry labels: "Detached", "Semi-Detached", "Terraced", "Flat / Maisonette"
 */
function filterRecordsByPropertyType(
  records: PricePaidRecord[],
  typeFilter: string | null
): PricePaidRecord[] {
  if (!typeFilter || !records.length) return records
  const lower   = typeFilter.toLowerCase()
  const matched = records.filter(r => r.propertyType.toLowerCase().includes(lower))
  // Keep filtered set only if we have enough data; otherwise fall back to all
  return matched.length >= 2 ? matched : records
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const RequestSchema = z.object({
  postcode:    z.string().min(5).max(8),
  address:     z.string().min(3).max(200),
  houseNumber: z.string().min(1).max(20),
  street:      z.string().min(2).max(100),
  askingPrice: z.number().positive().optional(),
})

// ─── Safe wrappers — never throw ─────────────────────────────────────────────

async function safeEPCLookup(
  postcode: string,
  address: string
): Promise<{ cert: EPCCertificate | null; upgrades: UpgradeRecommendation[]; matchScore: number | null; error?: string }> {
  try {
    const records = await withCache(
      CacheKey.epcPostcode(postcode),
      TTL.EPC_POSTCODE,
      () => searchByPostcode(postcode)
    )

    if (!records.length) {
      return { cert: null, upgrades: [], matchScore: null, error: 'No EPC found for this postcode' }
    }

    const match = findBestAddressMatch(address, records)
    if (!match) {
      return { cert: null, upgrades: [], matchScore: null, error: 'No EPC matched this address' }
    }

    return {
      cert:       match.record,
      upgrades:   getUpgradeRecommendations(match.record),
      matchScore: Math.round(match.score * 100) / 100,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[EPC Lookup Error]', msg)

    // Surface helpful messages for common failures
    if (msg.includes('401') || msg.includes('403') || msg.includes('Unauthorized')) {
      return { cert: null, upgrades: [], matchScore: null, error: 'EPC API auth failed — check EPC_API_EMAIL and EPC_API_KEY in .env.local' }
    }
    if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
      return { cert: null, upgrades: [], matchScore: null, error: 'Could not reach EPC Register — check your internet connection' }
    }
    return { cert: null, upgrades: [], matchScore: null, error: `EPC lookup failed: ${msg}` }
  }
}

async function safePricePaidLookup(postcode: string): Promise<{ records: PricePaidRecord[]; error?: string }> {
  try {
    // Fetch 25 records so we have enough to filter by property type after the EPC result is known
    const records = await withCache(
      CacheKey.pricePaid(postcode),
      TTL.LAND_REGISTRY,
      () => getPricePaidByPostcode(postcode, 25)
    )
    return { records }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[Land Registry Lookup Error]', msg)
    // Non-fatal — report still runs without price history
    return { records: [], error: `Price history unavailable: ${msg}` }
  }
}

function deriveYearBuilt(cert: EPCCertificate | null): number {
  if (!cert) return 1970
  // Use inspection date as a proxy — assume property ~30 years old at inspection
  const inspYear = new Date(cert['inspection-date']).getFullYear()
  return Math.max(1850, inspYear - 30)
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Parse body
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

  const { postcode, address, askingPrice } = parsed.data

  // 2. Check EPC credentials
  if (!process.env.EPC_API_EMAIL || !process.env.EPC_API_KEY) {
    return NextResponse.json(
      {
        error: 'EPC API not configured',
        hint: 'Add EPC_API_EMAIL and EPC_API_KEY to your .env.local file. Register free at epc.opendatacommunities.org',
      },
      { status: 503 }
    )
  }

  // 3. Run both lookups in parallel — each isolated so one failure doesn't kill the other
  const [epcResult, priceResult] = await Promise.all([
    safeEPCLookup(postcode, address),
    safePricePaidLookup(postcode),
  ])

  // 4. If EPC completely failed with auth error — surface it clearly
  if (epcResult.error?.includes('EPC API auth failed')) {
    return NextResponse.json({ error: epcResult.error }, { status: 401 })
  }

  // 5. Generate report (works even with no EPC / no price history)
  const yearBuilt = deriveYearBuilt(epcResult.cert)

  // Filter comparables to matching property type — avoids comparing a flat against detached houses
  const propertyTypeFilter    = derivePropertyTypeFilter(epcResult.cert)
  const filteredPriceRecords  = filterRecordsByPropertyType(priceResult.records, propertyTypeFilter)

  const report = generateHomebuyerReport({
    postcode,
    address,
    cert:                    epcResult.cert,
    upgradeRecommendations:  epcResult.upgrades,
    priceHistory:            filteredPriceRecords,
    askingPrice:             askingPrice ?? null,
    yearBuilt,
    comparablePropertyType:  propertyTypeFilter,
  })

  return NextResponse.json({
    success: true,
    report,
    meta: {
      epcFound:               !!epcResult.cert,
      epcMatchScore:          epcResult.matchScore,
      salesFound:             filteredPriceRecords.length,
      salesFoundTotal:        priceResult.records.length,
      comparablePropertyType: propertyTypeFilter,
      checksRun:              report.checks.length,
      warnings: [
        epcResult.error,
        priceResult.error,
      ].filter(Boolean),
    },
  })
}
