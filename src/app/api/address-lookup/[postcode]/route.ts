/**
 * GET /api/address-lookup/[postcode]
 *
 * Returns all addresses (with UPRNs) for a UK postcode using the
 * Homedata API. Requires HOMEDATA_API_KEY in environment.
 *
 * Response: { uprn: number; address: string }[]
 */

import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

/** Format a spaceless postcode into the canonical "AA1 1AA" form. */
function formatPostcode(raw: string): string {
  const pc = raw.replace(/\s/g, '').toUpperCase()
  // UK postcodes: inward code is always 3 chars (digit + 2 letters)
  if (pc.length >= 5) return `${pc.slice(0, -3)} ${pc.slice(-3)}`
  return pc
}

/** Build a single address string from whatever fields the item contains. */
function buildAddress(item: Record<string, unknown>): string {
  // Try flat address fields first
  if (typeof item['address'] === 'string' && item['address'].trim()) return item['address'].trim()
  if (typeof item['single_line_address'] === 'string' && item['single_line_address'].trim()) return item['single_line_address'].trim()
  if (typeof item['full_address'] === 'string' && item['full_address'].trim()) return item['full_address'].trim()

  // Try composing from parts
  const parts: string[] = []
  const strOrEmpty = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

  for (const key of ['sub_building_name', 'building_name', 'building_number',
                      'address_line_1', 'address_line_2', 'address_line_3',
                      'dependent_locality', 'post_town', 'locality']) {
    const val = strOrEmpty(item[key])
    if (val) parts.push(val)
  }
  return parts.join(', ')
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ postcode: string }> }
) {
  const { postcode: raw } = await params
  const clean     = decodeURIComponent(raw).replace(/\s/g, '').toUpperCase()
  const formatted = formatPostcode(clean)   // "SW1A 1AA"

  if (!clean || clean.length < 5) {
    return NextResponse.json({ error: 'Valid UK postcode required' }, { status: 400 })
  }

  const apiKey = process.env.HOMEDATA_API_KEY
  if (!apiKey || apiKey === 'your_homedata_api_key_here') {
    return NextResponse.json({ error: 'HOMEDATA_API_KEY not configured' }, { status: 503 })
  }

  // Try the formatted postcode (with space) first, fall back to compact form.
  // Some path-based APIs normalise differently from query-parameter APIs.
  const candidates = [formatted, clean]
  let lastError: string | null = null

  for (const pc of candidates) {
    try {
      const response = await axios.get(
        `https://api.homedata.co.uk/api/address/postcode/${encodeURIComponent(pc)}/`,
        {
          headers: { Authorization: `Api-Key ${apiKey}` },
          timeout: 8000,
        }
      )

      const raw: unknown = response.data
      console.log(`[address-lookup] pc=${pc} status=${response.status} type=${Array.isArray(raw) ? 'array' : typeof raw} keys=${Array.isArray(raw) ? `(array len ${(raw as unknown[]).length})` : Object.keys(raw as object ?? {}).join(',')}`)
      console.log(`[address-lookup] first item:`, JSON.stringify(Array.isArray(raw) ? (raw as unknown[])[0] : (raw as Record<string,unknown>)))

      // Unwrap list from various envelope shapes
      let items: Record<string, unknown>[] = []
      if (Array.isArray(raw)) {
        items = raw as Record<string, unknown>[]
      } else if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>
        // Try every common wrapper key
        for (const key of ['results', 'addresses', 'data', 'properties', 'items', 'address_list']) {
          if (Array.isArray(obj[key])) {
            items = obj[key] as Record<string, unknown>[]
            break
          }
        }
        // If still empty, check if the whole object IS the single item
        if (items.length === 0 && obj['uprn']) {
          items = [obj]
        }
      }

      if (items.length === 0) {
        console.log('[address-lookup] no items found in response — trying next format if available')
        lastError = `No addresses returned from Homedata for postcode "${pc}". Response shape: ${JSON.stringify(raw).slice(0, 200)}`
        continue   // try next postcode format
      }

      const results = items
        .map((item) => ({
          uprn:    typeof item['uprn'] === 'number' ? item['uprn'] : parseInt(String(item['uprn'] ?? ''), 10),
          address: buildAddress(item),
        }))
        .filter(r => r.address && !isNaN(r.uprn))

      console.log(`[address-lookup] returning ${results.length} addresses`)
      return NextResponse.json(results)

    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status ?? 500
        const detail = err.response?.data ?? err.message
        console.error('[address-lookup] Homedata error', status, JSON.stringify(detail))
        // Don't retry on auth errors — key is definitely wrong
        if (status === 401 || status === 403) {
          return NextResponse.json(
            { error: `Homedata API error ${status}: ${JSON.stringify(detail)}` },
            { status }
          )
        }
        lastError = `HTTP ${status}: ${JSON.stringify(detail)}`
      } else {
        lastError = String(err)
      }
    }
  }

  // Both formats tried and still no results
  console.log('[address-lookup] all formats exhausted, returning []')
  return NextResponse.json([])
}
