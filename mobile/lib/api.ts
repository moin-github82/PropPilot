/**
 * API client — points at the live Vercel deployment.
 * Change BASE_URL to your deployed URL or http://localhost:3000 for local dev.
 */
const BASE_URL = 'https://prop-health-psi.vercel.app'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

// ── Property report ───────────────────────────────────────────────────────────

export interface FloodResult {
  riskLevel:      'high' | 'medium' | 'low' | 'very-low'
  riskLabel:      string
  activeWarnings: number
  activeAlerts:   number
  floodAreaCount: number
  description:    string
}

export interface EpcResult {
  found: boolean
  message?: string
  certificate?: {
    address:       string
    currentBand:   string
    potentialBand: string
    currentScore:  number
    potentialScore: number
    propertyType:  string
    lodgementDate: string
    expiryDate:    string
  }
}

export interface CrimeResult {
  totalCrimes:   number
  topCategory:   string
  topCount:      number
  breakdown:     Record<string, number>
  period:        string
}

export interface BroadbandResult {
  found:           boolean
  avgDownload?:    number
  avgUpload?:      number
  superfast?:      boolean
  ultrafast?:      boolean
  message?:        string
}

export interface CouncilTaxResult {
  found:   boolean
  band?:   string
  area?:   string
  message?: string
}

export interface PropertyReport {
  postcode:    string
  address?:    string
  flood:       FloodResult
  epc:         EpcResult
  crime:       CrimeResult
  broadband:   BroadbandResult
  councilTax:  CouncilTaxResult
}

export async function fetchPropertyReport(postcode: string, address?: string): Promise<PropertyReport> {
  const clean = postcode.trim().toUpperCase().replace(/\s+/g, '')
  const params = new URLSearchParams({ postcode: clean })
  if (address) params.set('address', address)

  const res = await fetch(`${BASE_URL}/api/homebuyer/check?${params.toString()}`)
  if (!res.ok) throw new Error(`Failed to fetch report (${res.status})`)
  return res.json() as Promise<PropertyReport>
}

export async function fetchFlood(postcode: string): Promise<FloodResult> {
  return get<FloodResult>(`/api/flood-risk/${encodeURIComponent(postcode)}`)
}

export async function fetchEpc(postcode: string): Promise<EpcResult> {
  return get<EpcResult>(`/api/epc/${encodeURIComponent(postcode)}`)
}

export async function fetchCrime(postcode: string): Promise<CrimeResult> {
  return get<CrimeResult>(`/api/crime/${encodeURIComponent(postcode)}`)
}

export async function fetchBroadband(postcode: string): Promise<BroadbandResult> {
  return get<BroadbandResult>(`/api/broadband/${encodeURIComponent(postcode)}`)
}
