/**
 * EPC Register API Integration
 *
 * Provider : MHCLG (Ministry of Housing, Communities & Local Government)
 * Docs     : https://epc.opendatacommunities.org/docs/api
 * Auth     : Basic Auth (email + API key)
 * Register : https://epc.opendatacommunities.org/login/register
 */

import axios from 'axios'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EPCCertificate {
  'lmk-key': string
  address: string
  postcode: string
  'building-reference-number': string
  'current-energy-rating': string        // A–G
  'potential-energy-rating': string      // A–G
  'current-energy-efficiency': number    // 1–100
  'potential-energy-efficiency': number
  'property-type': string                // Flat | House | Bungalow | Maisonette | Park home
  'built-form': string                   // Detached | Semi-Detached | End-Terrace | Mid-Terrace | Enclosed End-Terrace | Enclosed Mid-Terrace
  'inspection-date': string
  'lodgement-date': string
  'transaction-type': string
  'environment-impact-current': number
  'environment-impact-potential': number
  'energy-consumption-current': number
  'energy-consumption-potential': number
  'co2-emissions-current': number
  'co2-emiss-curr-per-floor-area': number
  'co2-emissions-potential': number
  'lighting-cost-current': number
  'lighting-cost-potential': number
  'heating-cost-current': number
  'heating-cost-potential': number
  'hot-water-cost-current': number
  'hot-water-cost-potential': number
  'total-floor-area': number
  'energy-tariff': string
  'mains-gas-flag': string               // Y | N
  'floor-level': string
  'flat-top-storey': string
  'flat-storey-count': number
  'main-heating-controls': string
  'multi-glaze-proportion': number
  'glazed-area': string
  'extension-count': number
  'number-habitable-rooms': number
  'number-heated-rooms': number
  'low-energy-lighting': number
  'number-open-fireplaces': number
  'hotwater-description': string
  'floor-description': string
  'windows-description': string
  'walls-description': string
  'secondheat-description': string
  'sheating-env-eff': string
  'roof-description': string
  'roof-env-eff': string
  'mainheat-description': string
  'mainheat-env-eff': string
  'mainheatcont-description': string
  'lighting-description': string
  'main-fuel': string
  'wind-turbine-count': number
  'heat-loss-corridor': string
  'unheated-corridor-length': number
  'floor-height': number
  'photo-supply': number
  'solar-water-heating-flag': string     // Y | N
  'mechanical-ventilation': string
  'constituency': string
  'county': string
  'local-authority': string
  'tenure': string
  'fixed-lighting-outlets-count': number
  'low-energy-fixed-light-count': number
}

export interface UpgradeRecommendation {
  upgrade: string
  description: string
  estimatedCostRange: string
  annualSavingsRange: string
  bandImprovement: string
  grants: string[]
  priority: 'high' | 'medium' | 'low'
}

export interface EPCResult {
  certificate: EPCCertificate
  matchConfidence: number
  upgradeRecommendations: UpgradeRecommendation[]
  isStaleCertificate: boolean
  yearsOld: number
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function getAuthHeader(): string {
  const email  = process.env.EPC_API_EMAIL
  const apiKey = process.env.EPC_API_KEY
  if (!email || !apiKey) {
    throw new Error('EPC_API_EMAIL and EPC_API_KEY must be set in environment variables.')
  }
  const credentials = Buffer.from(`${email}:${apiKey}`).toString('base64')
  return `Basic ${credentials}`
}

const EPC_BASE = 'https://epc.opendatacommunities.org/api/v1'

// ─── Raw API calls ────────────────────────────────────────────────────────────

/**
 * Search for EPC certificates by postcode.
 * Returns up to 10 most recent certificates in that postcode.
 */
export async function searchByPostcode(postcode: string): Promise<EPCCertificate[]> {
  const clean = postcode.replace(/\s/g, '').toUpperCase()
  const response = await axios.get(`${EPC_BASE}/domestic/search`, {
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/json',
    },
    params: {
      postcode: clean,
      'page-size': 10,
      from: 0,
    },
  })
  return response.data?.rows ?? []
}

/**
 * Fetch a single certificate by its LMK key (unique certificate ID).
 */
export async function getCertificateByLmkKey(lmkKey: string): Promise<EPCCertificate | null> {
  const response = await axios.get(`${EPC_BASE}/domestic/certificate/${encodeURIComponent(lmkKey)}`, {
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/json',
    },
  })
  return response.data?.rows?.[0] ?? null
}

// ─── Address matching ─────────────────────────────────────────────────────────

/**
 * Normalise an address string for fuzzy comparison.
 */
function normaliseAddress(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Compute simple Dice coefficient similarity between two strings.
 * Returns 0–1. No external dependency required.
 */
function diceSimilarity(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0
  const bigrams = (s: string): Map<string, number> => {
    const m = new Map<string, number>()
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2)
      m.set(bg, (m.get(bg) ?? 0) + 1)
    }
    return m
  }
  const bA = bigrams(a), bB = bigrams(b)
  let intersection = 0
  for (const [key, count] of bA) {
    intersection += Math.min(count, bB.get(key) ?? 0)
  }
  return (2 * intersection) / (a.length + b.length - 2)
}

/**
 * Find the best-matching EPC certificate for a user-supplied address.
 * Returns null if no match exceeds the confidence threshold (0.45).
 */
export function findBestAddressMatch(
  userAddress: string,
  records: EPCCertificate[],
  threshold = 0.45
): { record: EPCCertificate; score: number } | null {
  const normUser = normaliseAddress(userAddress)
  const scored = records.map(record => ({
    record,
    score: diceSimilarity(normUser, normaliseAddress(record.address)),
  }))
  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]
  return best && best.score >= threshold ? best : null
}

// ─── Certificate age ──────────────────────────────────────────────────────────

export function getCertificateAgeYears(cert: EPCCertificate): number {
  const lodged = new Date(cert['lodgement-date'])
  const now    = new Date()
  return Math.floor((now.getTime() - lodged.getTime()) / (1000 * 60 * 60 * 24 * 365))
}

// ─── Upgrade recommendation engine ───────────────────────────────────────────

interface UpgradeRule {
  id: string
  check: (c: EPCCertificate) => boolean
  upgrade: string
  description: string
  estimatedCostRange: string
  annualSavingsRange: string
  bandImprovement: string
  grants: string[]
  priority: 'high' | 'medium' | 'low'
}

const UPGRADE_RULES: UpgradeRule[] = [
  {
    id: 'loft-insulation',
    check: c =>
      typeof c['roof-description'] === 'string' &&
      (c['roof-description'].toLowerCase().includes('no insulation') ||
       c['roof-description'].toLowerCase().includes('uninsulated')),
    upgrade: 'Loft insulation',
    description: 'Adding 270mm of mineral wool insulation to an uninsulated loft.',
    estimatedCostRange: '£300–£700',
    annualSavingsRange: '£150–£300/yr',
    bandImprovement: '+1–2 bands typical',
    grants: ['ECO4', 'Great British Insulation Scheme'],
    priority: 'high',
  },
  {
    id: 'cavity-wall',
    check: c =>
      typeof c['walls-description'] === 'string' &&
      c['walls-description'].toLowerCase().includes('cavity') &&
      c['walls-description'].toLowerCase().includes('no insulation'),
    upgrade: 'Cavity wall insulation',
    description: 'Injecting insulation material into the cavity between your inner and outer walls.',
    estimatedCostRange: '£400–£1,000',
    annualSavingsRange: '£100–£280/yr',
    bandImprovement: '+1 band typical',
    grants: ['ECO4', 'Great British Insulation Scheme'],
    priority: 'high',
  },
  {
    id: 'heat-pump',
    check: c =>
      c['main-fuel'] === 'mains gas' &&
      ['E', 'F', 'G', 'D'].includes(c['current-energy-rating']?.toUpperCase()),
    upgrade: 'Air source heat pump',
    description: 'Replace gas boiler with an air source heat pump. Most effective in well-insulated homes.',
    estimatedCostRange: '£7,000–£13,000',
    annualSavingsRange: '£500–£1,200/yr on bills',
    bandImprovement: '+2–3 bands typical',
    grants: ['Boiler Upgrade Scheme (£7,500 grant)'],
    priority: 'high',
  },
  {
    id: 'solar-pv',
    check: c =>
      c['solar-water-heating-flag'] !== 'Y' &&
      c['photo-supply'] === 0 &&
      ['Detached', 'Semi-Detached'].some(t => c['built-form']?.includes(t)),
    upgrade: 'Solar PV panels',
    description: 'Install solar photovoltaic panels to generate your own electricity.',
    estimatedCostRange: '£5,000–£8,000',
    annualSavingsRange: '£300–£700/yr',
    bandImprovement: '+1–2 bands typical',
    grants: ['Smart Export Guarantee (SEG payments)'],
    priority: 'medium',
  },
  {
    id: 'double-glazing',
    check: c =>
      typeof c['windows-description'] === 'string' &&
      c['windows-description'].toLowerCase().includes('single glazed'),
    upgrade: 'Double or triple glazing',
    description: 'Replace single-glazed windows throughout the property.',
    estimatedCostRange: '£3,000–£8,000',
    annualSavingsRange: '£80–£235/yr',
    bandImprovement: '+1 band typical',
    grants: ['ECO4 (for eligible households)'],
    priority: 'medium',
  },
  {
    id: 'floor-insulation',
    check: c =>
      typeof c['floor-description'] === 'string' &&
      c['floor-description'].toLowerCase().includes('uninsulated'),
    upgrade: 'Floor insulation',
    description: 'Insulate suspended timber or solid ground floors.',
    estimatedCostRange: '£800–£1,800',
    annualSavingsRange: '£40–£100/yr',
    bandImprovement: '+0.5 bands typical',
    grants: ['ECO4'],
    priority: 'low',
  },
  {
    id: 'smart-thermostat',
    check: c =>
      typeof c['mainheatcont-description'] === 'string' &&
      !c['mainheatcont-description'].toLowerCase().includes('programmer and roomstat'),
    upgrade: 'Smart thermostat',
    description: 'Install a smart thermostat (e.g. Nest, Hive) for better heating control.',
    estimatedCostRange: '£150–£300',
    annualSavingsRange: '£75–£150/yr',
    bandImprovement: 'Marginal band improvement',
    grants: [],
    priority: 'low',
  },
]

export function getUpgradeRecommendations(cert: EPCCertificate): UpgradeRecommendation[] {
  return UPGRADE_RULES
    .filter(rule => rule.check(cert))
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ id: _id, check: _check, ...rest }) => rest)
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.priority] - order[b.priority]
    })
}

// ─── Main public function ─────────────────────────────────────────────────────

/**
 * Look up the EPC certificate for a property.
 *
 * @param postcode - Full UK postcode (e.g. "SW1A 2AA")
 * @param address  - Full address line (e.g. "10 Downing Street")
 * @returns EPCResult or null if no certificate found
 */
export async function getPropertyEPC(
  postcode: string,
  address: string
): Promise<EPCResult | null> {
  const records = await searchByPostcode(postcode)

  if (!records.length) return null

  const match = findBestAddressMatch(address, records)
  if (!match) return null

  const { record: certificate, score: matchConfidence } = match
  const yearsOld = getCertificateAgeYears(certificate)

  return {
    certificate,
    matchConfidence,
    upgradeRecommendations: getUpgradeRecommendations(certificate),
    isStaleCertificate: yearsOld > 10,
    yearsOld,
  }
}
