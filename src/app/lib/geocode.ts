/**
 * Geocoding — postcodes.io
 *
 * Provider : postcodes.io
 * Auth     : None — fully public, no key required
 * Docs     : https://postcodes.io
 */

import axios from 'axios'

export interface GeocodeResult {
  latitude:          number
  longitude:         number
  adminDistrict:     string   // e.g. "London Borough of Southwark"
  adminDistrictCode: string   // e.g. "E09000028"
  adminWard:         string
  region:            string
  country:           string
  nuts:              string   // NUTS region code
}

export async function geocodePostcode(postcode: string): Promise<GeocodeResult | null> {
  try {
    const clean = postcode.replace(/\s/g, '').toUpperCase()
    const response = await axios.get(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`,
      { timeout: 5000 }
    )
    const r = response.data?.result
    if (!r) return null
    return {
      latitude:          r.latitude,
      longitude:         r.longitude,
      adminDistrict:     r.admin_district     ?? '',
      adminDistrictCode: r.codes?.admin_district ?? '',
      adminWard:         r.admin_ward          ?? '',
      region:            r.region              ?? '',
      country:           r.country             ?? '',
      nuts:              r.codes?.nuts          ?? '',
    }
  } catch {
    return null
  }
}
