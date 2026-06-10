/**
 * GET /api/address-search?q={query}
 *
 * Address typeahead using Homedata /address/find/ endpoint.
 * Returns { suggestions: [{ uprn, address, postcode, town }] }
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  const apiKey = process.env.HOMEDATA_API_KEY
  if (!apiKey || apiKey === 'your_homedata_api_key_here') {
    return NextResponse.json(
      { error: 'HOMEDATA_API_KEY not configured', suggestions: [] },
      { status: 503 }
    )
  }

  try {
    const url = `https://api.homedata.co.uk/address/find/?q=${encodeURIComponent(q.trim())}`
    const res = await fetch(url, {
      headers: { Authorization: `Api-Key ${apiKey}` },
      signal: AbortSignal.timeout(6000),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: `Homedata ${res.status}: ${JSON.stringify(body)}`, suggestions: [] },
        { status: res.status }
      )
    }

    const data = await res.json()
    // Homedata returns { suggestions: [{ uprn, address, address_line_1, address_line_2, town, postcode }] }
    const suggestions = (data.suggestions ?? []).map((s: Record<string, unknown>) => ({
      uprn:     s.uprn,
      address:  s.address,
      town:     s.town ?? '',
      postcode: s.postcode ?? '',
    }))

    return NextResponse.json({ suggestions })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg, suggestions: [] }, { status: 500 })
  }
}
