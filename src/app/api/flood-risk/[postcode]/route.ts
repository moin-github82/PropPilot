/**
 * GET /api/flood-risk/[postcode]
 *
 * Returns flood risk information for a postcode using:
 *  - postcodes.io  → lat/lng
 *  - EA Flood Monitoring API (public, no auth required)
 *    • Active flood alerts/warnings within 5 km
 *    • Number of monitored flood areas within 5 km
 *
 * EA API docs: https://environment.data.gov.uk/flood-monitoring/doc/reference
 */

import { NextRequest, NextResponse } from 'next/server'
import { geocodePostcode } from '../../../lib/geocode'
import { withCache, TTL } from '../../../lib/cache'
import axios from 'axios'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FloodRiskResult {
  postcode:        string
  riskLevel:       'high' | 'medium' | 'low' | 'very-low'
  riskLabel:       string
  activeWarnings:  number  // severity 1 (Severe) or 2 (Warning)
  activeAlerts:    number  // severity 3 (Alert)
  floodAreaCount:  number  // number of EA-monitored flood areas nearby
  description:     string
  checkUrl:        string
}

// ─── EA Flood Monitoring API ──────────────────────────────────────────────────

const EA_BASE = 'https://environment.data.gov.uk/flood-monitoring'

async function fetchFloodData(lat: number, lng: number): Promise<FloodRiskResult> {
  const dist = 3  // km radius

  const [floorsRes, areasRes] = await Promise.allSettled([
    // Active flood alerts / warnings within dist km
    axios.get(`${EA_BASE}/api/2.0/floods`, {
      params: { lat, long: lng, dist },
      timeout: 6000,
    }),
    // Monitored flood areas within dist km (indicative of flood-sensitive zone)
    axios.get(`${EA_BASE}/id/floodAreas`, {
      params: { lat, long: lng, dist },
      timeout: 6000,
    }),
  ])

  let activeWarnings = 0
  let activeAlerts   = 0
  let floodAreaCount = 0

  if (floorsRes.status === 'fulfilled') {
    const items: { severityLevel?: number }[] = floorsRes.value.data?.items ?? []
    for (const item of items) {
      if (item.severityLevel === 1 || item.severityLevel === 2) activeWarnings++
      if (item.severityLevel === 3) activeAlerts++
    }
  }

  if (areasRes.status === 'fulfilled') {
    const items: unknown[] = areasRes.value.data?.items ?? []
    floodAreaCount = items.length
  }

  // Derive risk level
  let riskLevel: FloodRiskResult['riskLevel']
  let riskLabel: string
  let description: string

  if (activeWarnings > 0) {
    riskLevel   = 'high'
    riskLabel   = 'High — active warning'
    description = `There ${activeWarnings === 1 ? 'is' : 'are'} ${activeWarnings} active flood ${activeWarnings === 1 ? 'warning' : 'warnings'} in this area right now. This property is in a flood-sensitive zone. Check with the EA and your insurer before proceeding.`
  } else if (activeAlerts > 0) {
    riskLevel   = 'medium'
    riskLabel   = 'Medium — active alert'
    description = `There ${activeAlerts === 1 ? 'is' : 'are'} ${activeAlerts} active flood ${activeAlerts === 1 ? 'alert' : 'alerts'} near this postcode. The area is being monitored. Review the EA flood map for the full risk zone picture.`
  } else if (floodAreaCount >= 3) {
    riskLevel   = 'medium'
    riskLabel   = 'Medium — flood-sensitive area'
    description = `${floodAreaCount} EA-monitored flood zones are within 3 km of this postcode. No active alerts right now, but the area has a history of flood risk. Check the full risk map and get a specialist insurance quote.`
  } else if (floodAreaCount >= 1) {
    riskLevel   = 'low'
    riskLabel   = 'Low — some flood areas nearby'
    description = `${floodAreaCount} EA flood zone${floodAreaCount > 1 ? 's' : ''} within 3 km, but no active warnings or alerts. Flood risk appears low — confirm with the EA flood map and check home insurance covers flooding.`
  } else {
    riskLevel   = 'very-low'
    riskLabel   = 'Very low'
    description = 'No EA-monitored flood areas within 3 km and no active warnings or alerts. Flood risk appears very low for this postcode.'
  }

  return {
    postcode:       '',
    riskLevel,
    riskLabel,
    activeWarnings,
    activeAlerts,
    floodAreaCount,
    description,
    checkUrl: 'https://check-for-flooding.service.gov.uk/',
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ postcode: string }> }
) {
  const { postcode: raw } = await params
  const postcode = decodeURIComponent(raw).replace(/\s/g, '').toUpperCase()

  if (!postcode || postcode.length < 5) {
    return NextResponse.json({ error: 'Valid UK postcode required' }, { status: 400 })
  }

  const geo = await geocodePostcode(postcode)
  if (!geo) {
    return NextResponse.json({ error: 'Could not geocode postcode' }, { status: 404 })
  }

  const cacheKey = `flood-risk:${postcode}`
  const data = await withCache(cacheKey, TTL.LAND_REGISTRY, () =>
    fetchFloodData(geo.latitude, geo.longitude)
  )

  return NextResponse.json({ ...data, postcode })
}
