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

    const results: { uprn: number; address: string }[] =
      (response.data?.results ?? []).map((r: { uprn: number; address: string }) => ({
        uprn:    r.uprn,
        address: r.address,
      }))

    return NextResponse.json(results)
  } catch (err) {
    const status = axios.isAxiosError(err) ? (err.response?.status ?? 500) : 500
    return NextResponse.json({ error: 'Address lookup failed' }, { status })
  }
}
