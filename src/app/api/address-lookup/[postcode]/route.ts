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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ postcode: string }> }
) {
  const { postcode: raw } = await params
  const postcode = decodeURIComponent(raw).replace(/\s/g, '').toUpperCase()

  if (!postcode || postcode.length < 5) {
    return NextResponse.json({ error: 'Valid UK postcode required' }, { status: 400 })
  }

  const apiKey = process.env.HOMEDATA_API_KEY
  if (!apiKey || apiKey === 'your_homedata_api_key_here') {
    return NextResponse.json({ error: 'HOMEDATA_API_KEY not configured' }, { status: 503 })
  }

  try {
    const response = await axios.get(
      `https://api.homedata.co.uk/api/address/postcode/${encodeURIComponent(postcode)}/`,
      {
        headers: { Authorization: `Api-Key ${apiKey}` },
        timeout: 8000,
      }
    )

    // Log raw shape so we can see it in the Next.js terminal
    console.log('[address-lookup] raw response keys:', Object.keys(response.data ?? {}))
    console.log('[address-lookup] raw response (first 500 chars):', JSON.stringify(response.data).slice(0, 500))

    // Homedata may return { results: [...] } or a flat array or { addresses: [...] }
    const raw: unknown = response.data
    let items: { uprn: number; address: string }[] = []
    if (Array.isArray(raw)) {
      items = raw
    } else if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>
      // try common keys
      const list = obj['results'] ?? obj['addresses'] ?? obj['data'] ?? []
      items = Array.isArray(list) ? list as { uprn: number; address: string }[] : []
    }

    const results = items.map((r: { uprn: number; address: string }) => ({
      uprn:    r.uprn,
      address: r.address,
    }))

    console.log('[address-lookup] returning', results.length, 'addresses')
    return NextResponse.json(results)
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 500
      const detail = err.response?.data ?? err.message
      console.error('[address-lookup] Homedata error', status, JSON.stringify(detail))
      return NextResponse.json(
        { error: `Homedata API error ${status}: ${JSON.stringify(detail)}` },
        { status }
      )
    }
    console.error('[address-lookup] Unexpected error', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
