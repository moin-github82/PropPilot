/**
 * Planning & Property Restrictions — planning.data.gov.uk
 *
 * Provider : DLUHC Planning Data Platform
 * Endpoint : https://www.planning.data.gov.uk/api/v1/entity.json
 * Auth     : None — fully public
 * Docs     : https://www.planning.data.gov.uk/docs
 *
 * NOTE: The `planning-application` dataset only covers councils in the
 * Open Digital Planning pilot (~30 LPAs). Instead we query datasets with
 * near-complete UK coverage that are equally important for homebuyers:
 *
 *  - conservation-area     — restricts external alterations, affects value
 *  - listed-building       — heavy cost/legal implications for modifications
 *  - article-4-direction   — removes permitted development rights
 *
 * We also try planning-application but gracefully handle no coverage.
 */

import axios from 'axios'
import type { GeocodeResult } from './geocode'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlanningDecisionType = 'approved' | 'refused' | 'withdrawn' | 'pending' | 'unknown'

export interface PlanningApplication {
  reference:    string
  description:  string
  status:       string
  decisionType: PlanningDecisionType
  date:         string | null
}

export interface PlanningSummary {
  // Restriction flags
  inConservationArea:     boolean
  conservationAreaName:   string | null
  listedBuilding:         boolean
  listedBuildingGrade:    string | null   // "I", "II*", "II"
  articleFourDirection:   boolean
  articleFourDescription: string | null
  // Applications ON the property itself (last 5 years) — pilot LPAs only
  propertyApplications:   PlanningApplication[]
  // Applications NEARBY (within 500 m, last 5 years) — pilot LPAs only
  nearbyApplications:     PlanningApplication[]
  // For display convenience
  applicationsFound:      number   // propertyApplications.length + nearbyApplications.length
  // Links
  lpaName:                string
  lpaSearchUrl:           string
  lpaApplicationsUrl:     string
}

// ─── LPA portal URLs (expanded — England & Wales) ────────────────────────────
// Key: ONS admin_district code from postcodes.io
// Value: Planning applications search URL for the council

const LPA_PORTALS: Record<string, { search: string; applications: string }> = {
  // ── London boroughs ──────────────────────────────────────────────────────
  E09000001: { search: 'https://www.cityoflondon.gov.uk/services/planning',                         applications: 'https://www.planning2.cityoflondon.gov.uk/online-applications/' },
  E09000002: { search: 'https://planning.barking-dagenham.gov.uk/online-applications/',              applications: 'https://planning.barking-dagenham.gov.uk/online-applications/' },
  E09000003: { search: 'https://www.barnet.gov.uk/planning-and-building/planning-applications',      applications: 'https://publicaccess.barnet.gov.uk/online-applications/' },
  E09000004: { search: 'https://pa.bexley.gov.uk/online-applications/',                             applications: 'https://pa.bexley.gov.uk/online-applications/' },
  E09000005: { search: 'https://www.brent.gov.uk/planning-and-building-control',                    applications: 'https://pa.brent.gov.uk/online-applications/' },
  E09000006: { search: 'https://searchapps.bromley.gov.uk/bromplanning/search/',                    applications: 'https://searchapps.bromley.gov.uk/bromplanning/search/' },
  E09000007: { search: 'https://www.camden.gov.uk/planning-applications',                           applications: 'https://camdocs.camden.gov.uk/online-applications/' },
  E09000008: { search: 'https://www.croydon.gov.uk/planning-and-regeneration',                      applications: 'https://publicaccess3.croydon.gov.uk/online-applications/' },
  E09000009: { search: 'https://pam.ealing.gov.uk/online-applications/',                            applications: 'https://pam.ealing.gov.uk/online-applications/' },
  E09000010: { search: 'https://planningservices.enfield.gov.uk/online-applications/',              applications: 'https://planningservices.enfield.gov.uk/online-applications/' },
  E09000011: { search: 'https://planning.greenwich.gov.uk/online-applications/',                    applications: 'https://planning.greenwich.gov.uk/online-applications/' },
  E09000012: { search: 'https://planning.hackney.gov.uk/online-applications/',                      applications: 'https://planning.hackney.gov.uk/online-applications/' },
  E09000013: { search: 'https://www.lbhf.gov.uk/planning',                                         applications: 'https://public.planningportal.co.uk/lbhf/online-applications/' },
  E09000014: { search: 'https://planning.haringey.gov.uk/online-applications/',                     applications: 'https://planning.haringey.gov.uk/online-applications/' },
  E09000015: { search: 'https://www.harrow.gov.uk/planning',                                        applications: 'https://publicaccess.harrow.gov.uk/online-applications/' },
  E09000016: { search: 'https://development.havering.gov.uk/online-applications/',                  applications: 'https://development.havering.gov.uk/online-applications/' },
  E09000017: { search: 'https://www.hillingdon.gov.uk/planning',                                    applications: 'https://publicaccess.hillingdon.gov.uk/online-applications/' },
  E09000018: { search: 'https://www.hounslow.gov.uk/planning',                                      applications: 'https://publicregister.hounslow.gov.uk/online-applications/' },
  E09000019: { search: 'https://www.islington.gov.uk/planning',                                     applications: 'https://publicaccess.islington.gov.uk/online-applications/' },
  E09000020: { search: 'https://planning.rbkc.gov.uk/online-applications/',                         applications: 'https://planning.rbkc.gov.uk/online-applications/' },
  E09000021: { search: 'https://www.kingston.gov.uk/planning',                                      applications: 'https://publicaccess.kingston.gov.uk/online-applications/' },
  E09000022: { search: 'https://www.lambeth.gov.uk/planning-and-building-control',                  applications: 'https://publicaccess.lambeth.gov.uk/online-applications/' },
  E09000023: { search: 'https://planning.lewisham.gov.uk/online-applications/',                     applications: 'https://planning.lewisham.gov.uk/online-applications/' },
  E09000024: { search: 'https://www.merton.gov.uk/environment-and-transport/planning',              applications: 'https://publicaccess.merton.gov.uk/online-applications/' },
  E09000025: { search: 'https://www.newham.gov.uk/planning-and-building-control',                   applications: 'https://publicaccess.newham.gov.uk/online-applications/' },
  E09000026: { search: 'https://www.redbridge.gov.uk/planning',                                     applications: 'https://publicaccess.redbridge.gov.uk/online-applications/' },
  E09000027: { search: 'https://www.richmond.gov.uk/planning',                                      applications: 'https://www.richmond.gov.uk/council/planning/planning_applications_and_appeals' },
  E09000028: { search: 'https://www.southwark.gov.uk/planning',                                     applications: 'https://www.southwark.gov.uk/planning-and-building-control/planning-applications/search-applications' },
  E09000029: { search: 'https://www.sutton.gov.uk/planning',                                        applications: 'https://publicaccess.sutton.gov.uk/online-applications/' },
  E09000030: { search: 'https://www.towerhamlets.gov.uk/lgnl/planning_and_building_control',        applications: 'https://development.towerhamlets.gov.uk/online-applications/' },
  E09000031: { search: 'https://www.walthamforest.gov.uk/planning',                                 applications: 'https://planning.walthamforest.gov.uk/online-applications/' },
  E09000032: { search: 'https://www.wandsworth.gov.uk/planning',                                    applications: 'https://planning2.wandsworth.gov.uk/online-applications/' },
  E09000033: { search: 'https://www.westminster.gov.uk/planning-building-control',                  applications: 'https://idoxpa.westminster.gov.uk/online-applications/' },

  // ── Metropolitan districts ────────────────────────────────────────────────
  // Greater Manchester
  E08000001: { search: 'https://www.bolton.gov.uk/planning-building-control',                       applications: 'https://www.bolton.gov.uk/planning-building-control/planning-applications' },
  E08000003: { search: 'https://publicaccess.manchester.gov.uk/online-applications/',               applications: 'https://publicaccess.manchester.gov.uk/online-applications/' },
  E08000004: { search: 'https://www.oldham.gov.uk/info/200183/planning_applications',               applications: 'https://www.oldham.gov.uk/info/200183/planning_applications' },
  E08000006: { search: 'https://www.salford.gov.uk/planning',                                       applications: 'https://publicaccess.salford.gov.uk/online-applications/' },
  E08000007: { search: 'https://www.stockport.gov.uk/planning',                                     applications: 'https://planning.stockport.gov.uk/PlanningData-Live/index.html' },
  E08000008: { search: 'https://www.tameside.gov.uk/planning',                                      applications: 'https://www.tameside.gov.uk/planningapplications' },
  E08000009: { search: 'https://www.trafford.gov.uk/residents/planning/planning.aspx',              applications: 'https://www.trafford.gov.uk/residents/planning/planning.aspx' },
  E08000010: { search: 'https://www.wigan.gov.uk/Resident/Planning/Planning.aspx',                  applications: 'https://www.wigan.gov.uk/Resident/Planning/Planning.aspx' },
  // West Midlands
  E08000025: { search: 'https://www.birmingham.gov.uk/info/20014/planning',                         applications: 'https://idoxpa.westmidlands.gov.uk/online-applications/' },
  E08000026: { search: 'https://www.coventry.gov.uk/planning',                                      applications: 'https://eplan.coventry.gov.uk/online-applications/' },
  E08000027: { search: 'https://www.dudley.gov.uk/residents/planning/',                             applications: 'https://www.dudley.gov.uk/residents/planning/planning-applications/' },
  E08000028: { search: 'https://www.sandwell.gov.uk/planning',                                      applications: 'https://sandwell.gov.uk/planning' },
  E08000029: { search: 'https://www.solihull.gov.uk/planning',                                      applications: 'https://eplan.solihull.gov.uk/online-applications/' },
  E08000030: { search: 'https://www.walsall.gov.uk/planning',                                       applications: 'https://www.walsall.gov.uk/planning' },
  E08000031: { search: 'https://www.wolverhampton.gov.uk/planning',                                 applications: 'https://www.wolverhampton.gov.uk/planning' },
  // West Yorkshire
  E08000032: { search: 'https://www.bradford.gov.uk/planning',                                      applications: 'https://publicaccess.bradford.gov.uk/online-applications/' },
  E08000033: { search: 'https://www.calderdale.gov.uk/v2/residents/planning',                       applications: 'https://publicaccess.calderdale.gov.uk/online-applications/' },
  E08000034: { search: 'https://www.kirklees.gov.uk/beta/planning-and-building-control',            applications: 'https://www.kirklees.gov.uk/beta/planning-and-building-control/index.aspx' },
  E08000035: { search: 'https://publicaccess.leeds.gov.uk/online-applications/',                    applications: 'https://publicaccess.leeds.gov.uk/online-applications/' },
  E08000036: { search: 'https://www.wakefield.gov.uk/residents/planning-and-building',              applications: 'https://planning.wakefield.gov.uk/online-applications/' },
  // South Yorkshire
  E08000016: { search: 'https://www.barnsley.gov.uk/services/planning-and-property/',               applications: 'https://www.barnsley.gov.uk/services/planning-and-property/planning-applications/' },
  E08000017: { search: 'https://www.doncaster.gov.uk/services/planning',                            applications: 'https://www.doncaster.gov.uk/services/planning/planning-applications' },
  E08000018: { search: 'https://www.rotherham.gov.uk/planning',                                     applications: 'https://roam.rotherham.gov.uk/online-applications/' },
  E08000019: { search: 'https://www.sheffield.gov.uk/planning',                                     applications: 'https://planningapps.sheffield.gov.uk/online-applications/' },
  // Merseyside
  E08000011: { search: 'https://www.knowsley.gov.uk/residents/planning',                            applications: 'https://planning.knowsley.gov.uk/online-applications/' },
  E08000012: { search: 'https://www.liverpool.gov.uk/planning',                                     applications: 'https://liverpool.gov.uk/planning' },
  E08000013: { search: 'https://www.sthelens.gov.uk/planning',                                      applications: 'https://pa.sthelens.gov.uk/online-applications/' },
  E08000014: { search: 'https://www.sefton.gov.uk/planning',                                        applications: 'https://pa.sefton.gov.uk/online-applications/' },
  E08000015: { search: 'https://www.wirral.gov.uk/planning-and-building',                           applications: 'https://planning.wirral.gov.uk/online-applications/' },

  // ── Unitary authorities ───────────────────────────────────────────────────
  E06000042: { search: 'https://publicaccess.milton-keynes.gov.uk/online-applications/',            applications: 'https://publicaccess.milton-keynes.gov.uk/online-applications/' },
  E06000023: { search: 'https://www2.bristol.gov.uk/planningonline/',                               applications: 'https://www2.bristol.gov.uk/planningonline/' },
  E06000015: { search: 'https://iplan.derby.gov.uk/online-applications/',                           applications: 'https://iplan.derby.gov.uk/online-applications/' },
  E06000018: { search: 'https://planningregister.nottinghamcity.gov.uk/online-applications/',       applications: 'https://planningregister.nottinghamcity.gov.uk/online-applications/' },
  E06000043: { search: 'https://www.northamptonshire.gov.uk/planning',                              applications: 'https://www.northamptonshire.gov.uk/planning' },
  E06000005: { search: 'https://www.darlington.gov.uk/planning',                                    applications: 'https://publicaccess.darlington.gov.uk/online-applications/' },
  E06000047: { search: 'https://www.durham.gov.uk/planning',                                        applications: 'https://publicaccess.durham.gov.uk/online-applications/' },
  E06000011: { search: 'https://www.hartlepool.gov.uk/planning',                                    applications: 'https://eplan.hartlepool.gov.uk/online-applications/' },
  E06000001: { search: 'https://www.hartlepool.gov.uk/planning',                                    applications: 'https://eplan.hartlepool.gov.uk/online-applications/' },
  E06000003: { search: 'https://www.redcar-cleveland.gov.uk/planning',                              applications: 'https://planning.redcar-cleveland.gov.uk/online-applications/' },
  E06000007: { search: 'https://www.stockton.gov.uk/planning',                                      applications: 'https://www.stockton.gov.uk/planning' },
  E06000021: { search: 'https://www.stoke.gov.uk/planning',                                         applications: 'https://www.stoke.gov.uk/planning' },
  E06000030: { search: 'https://www.swindon.gov.uk/planning',                                       applications: 'https://pa.swindon.gov.uk/online-applications/' },
  E06000006: { search: 'https://www.halton.gov.uk/planning',                                        applications: 'https://publicaccess.halton.gov.uk/online-applications/' },
  E06000008: { search: 'https://www.warrington.gov.uk/planning',                                    applications: 'https://planning.warrington.gov.uk/online-applications/' },
  E06000014: { search: 'https://www.york.gov.uk/planning',                                          applications: 'https://publicaccess.york.gov.uk/online-applications/' },
  E06000022: { search: 'https://www.telford.gov.uk/planning',                                       applications: 'https://www.telford.gov.uk/planning' },
  E06000038: { search: 'https://www.reading.gov.uk/planning',                                       applications: 'https://www.reading.gov.uk/planning-and-building-control/planning-applications/' },
  E06000040: { search: 'https://publicaccess.windsor.gov.uk/online-applications/',                  applications: 'https://publicaccess.windsor.gov.uk/online-applications/' },
  E06000041: { search: 'https://www.wokingham.gov.uk/planning',                                     applications: 'https://www.wokingham.gov.uk/planning-and-building-control' },
  E06000034: { search: 'https://planning.thanet.gov.uk/online-applications/',                       applications: 'https://planning.thanet.gov.uk/online-applications/' },
  E06000045: { search: 'https://northumberland.gov.uk/planning',                                    applications: 'https://publicaccess.northumberland.gov.uk/online-applications/' },
  E06000046: { search: 'https://www.newcastle.gov.uk/planning',                                     applications: 'https://publicaccess.newcastle.gov.uk/online-applications/' },
  E06000057: { search: 'https://www.northumberland.gov.uk/planning',                                applications: 'https://publicaccess.northumberland.gov.uk/online-applications/' },

  // ── Wales ─────────────────────────────────────────────────────────────────
  W06000015: { search: 'https://www.cardiff.gov.uk/ENG/resident/Planning/Pages/default.aspx',       applications: 'https://www.cardiff.gov.uk/ENG/resident/Planning/Planning-Applications/Pages/default.aspx' },
  W06000011: { search: 'https://www.swansea.gov.uk/planning',                                       applications: 'https://www.swansea.gov.uk/planningapplications' },
}

// ─── Planning Data API ────────────────────────────────────────────────────────

const PLANNING_API = 'https://www.planning.data.gov.uk/api/v1/entity.json'

interface PDGEntity {
  name?:        string
  description?: string
  reference?:   string
  dataset?:     string
  entity?:      number
  'entry-date'?: string
  'start-date'?: string
  geometry?:    string
  [key: string]: unknown
}

async function queryDataset(
  dataset:   string,
  geo:       GeocodeResult,
  radius     = 0,
  dateMin?:  string          // ISO date string e.g. "2020-04-17"
): Promise<PDGEntity[]> {
  try {
    const params: Record<string, unknown> = {
      dataset,
      point: `POINT(${geo.longitude} ${geo.latitude})`,
      geometry_relation: 'intersects',
      limit: 20,
    }
    if (radius > 0)  params.radius = radius
    if (dateMin)     params['entry-date-minimum'] = dateMin

    const response = await axios.get(PLANNING_API, {
      params,
      headers: { Accept: 'application/json' },
      timeout: 8000,
    })

    return (response.data?.entities ?? []) as PDGEntity[]
  } catch {
    return []
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map a raw status string to a clean decision type */
function mapDecisionType(raw: string): PlanningDecisionType {
  const s = raw.toLowerCase()
  if (s.includes('refused') || s.includes('refusal') || s.includes('reject')) return 'refused'
  if (s.includes('withdrawn'))                                                  return 'withdrawn'
  if (s.includes('approved') || s.includes('granted') || s.includes('permit')) return 'approved'
  if (s.includes('pending') || s.includes('progress') || s.includes('consideration') || s.includes('received')) return 'pending'
  return 'unknown'
}

function toApplication(a: PDGEntity): PlanningApplication {
  const status = String(a['development-status'] ?? a.status ?? 'Unknown')
  return {
    reference:    String(a.reference ?? a.entity ?? ''),
    description:  String(a.description ?? a.name ?? 'No description available'),
    status,
    decisionType: mapDecisionType(status),
    date:         (a['entry-date'] ?? a['start-date'] ?? null) as string | null,
  }
}

/** ISO date string for N years ago */
function yearsAgo(n: number): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - n)
  return d.toISOString().split('T')[0]
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

function getPortalUrls(geo: GeocodeResult, postcode: string) {
  const known = LPA_PORTALS[geo.adminDistrictCode]
  if (known) return known

  // Generic fallback — Planning Portal national search
  const encoded = encodeURIComponent(postcode.replace(/\s/g, '').toUpperCase())
  return {
    search:       `https://www.planningportal.co.uk/applications`,
    applications: `https://www.planningportal.co.uk/applications?postcode=${encoded}`,
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getPlanningData(
  geo:      GeocodeResult,
  postcode: string
): Promise<PlanningSummary> {
  const portal    = getPortalUrls(geo, postcode)
  const lpaName   = geo.adminDistrict || 'your local council'
  const fiveYearsAgo = yearsAgo(5)

  // Run all dataset queries in parallel:
  // — Restrictions: no date filter (designations don't expire)
  // — Applications: date-filtered to last 5 years; two separate queries:
  //     propertyApps: intersects the exact point (applications on this property)
  //     nearbyApps:   500 m radius (neighbouring developments)
  const [
    conservationAreas,
    listedBuildings,
    articleFours,
    propertyApps,
    nearbyApps,
  ] = await Promise.all([
    queryDataset('conservation-area',   geo),
    queryDataset('listed-building',     geo),
    queryDataset('article-4-direction', geo),
    queryDataset('planning-application', geo, 0,   fiveYearsAgo),
    queryDataset('planning-application', geo, 500, fiveYearsAgo),
  ])

  // Conservation area
  const inConservationArea   = conservationAreas.length > 0
  const conservationAreaName = conservationAreas[0]?.name ?? null

  // Listed building — grade from name/description field
  const listedBuilding = listedBuildings.length > 0
  let listedBuildingGrade: string | null = null
  if (listedBuilding) {
    const desc = String(listedBuildings[0]?.description ?? listedBuildings[0]?.name ?? '')
    if (desc.match(/grade i[^i]/i) || desc.match(/grade 1/i))     listedBuildingGrade = 'I'
    else if (desc.match(/grade ii\*/i) || desc.match(/grade 2\*/i)) listedBuildingGrade = 'II*'
    else                                                             listedBuildingGrade = 'II'
  }

  // Article 4 direction
  const articleFourDirection   = articleFours.length > 0
  const articleFourDescription = articleFours[0]?.description ?? articleFours[0]?.name ?? null

  // Planning applications — deduplicate nearbyApps so property-level apps don't appear in both
  const propertyRefs       = new Set(propertyApps.map(a => String(a.reference ?? a.entity)))
  const deduplicatedNearby = nearbyApps.filter(a => !propertyRefs.has(String(a.reference ?? a.entity)))

  const propertyApplications = propertyApps.map(toApplication)
  const nearbyApplications   = deduplicatedNearby.slice(0, 10).map(toApplication)

  return {
    inConservationArea,
    conservationAreaName,
    listedBuilding,
    listedBuildingGrade,
    articleFourDirection,
    articleFourDescription: articleFourDescription ? String(articleFourDescription) : null,
    propertyApplications,
    nearbyApplications,
    applicationsFound: propertyApplications.length + nearbyApplications.length,
    lpaName,
    lpaSearchUrl:       portal.search,
    lpaApplicationsUrl: portal.applications,
  }
}
