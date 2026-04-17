/**
 * Land Registry Price Paid Data API
 *
 * Provider  : HM Land Registry
 * Endpoint  : https://landregistry.data.gov.uk (SPARQL / REST)
 * Auth      : None required — fully public
 * Docs      : https://landregistry.data.gov.uk/app/ppd
 *
 * Also uses the UK House Price Index (HPI) API for current valuations.
 */

import axios from 'axios'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PricePaidRecord {
  transactionId: string
  price: number
  date: string            // ISO date string
  postcode: string
  propertyType: string    // D=Detached, S=Semi-Detached, T=Terraced, F=Flat/Maisonette
  newBuild: boolean
  estateTenure: string    // F=Freehold, L=Leasehold
  address: {
    paon: string          // Primary addressable object name (house number/name)
    saon: string          // Secondary addressable object name (flat/unit)
    street: string
    locality: string
    town: string
    district: string
    county: string
  }
}

export interface HPIData {
  date: string
  indexValue: number
  changeMonthly: number   // % change month-on-month
  changeAnnual: number    // % change year-on-year
  averagePrice: number
  region: string
}

export interface PropertyValuation {
  estimatedValue: number
  estimatedValueLow: number
  estimatedValueHigh: number
  lastSalePrice: number | null
  lastSaleDate: string | null
  priceHistory: PricePaidRecord[]
  currentHPI: HPIData | null
  growthSinceLastSale: number | null  // percentage
  postcode: string
  propertyType: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PROPERTY_TYPE_MAP: Record<string, string> = {
  D: 'Detached',
  S: 'Semi-Detached',
  T: 'Terraced',
  F: 'Flat / Maisonette',
}

const TENURE_MAP: Record<string, string> = {
  F: 'Freehold',
  L: 'Leasehold',
}

function normalisePostcode(postcode: string): string {
  return postcode.replace(/\s/g, '').toUpperCase()
}

function formatPostcodeForQuery(postcode: string): string {
  // Land Registry SPARQL wants postcodes with a space: "SW1A 2AA"
  const clean = normalisePostcode(postcode)
  return clean.slice(0, -3) + ' ' + clean.slice(-3)
}

// ─── Price Paid Data via SPARQL ───────────────────────────────────────────────

const SPARQL_ENDPOINT = 'https://landregistry.data.gov.uk/landregistry/query'

/**
 * Fetch recent sales for a postcode using the SPARQL endpoint.
 * Returns up to 10 most recent transactions.
 */
export async function getPricePaidByPostcode(
  postcode: string,
  limit = 10
): Promise<PricePaidRecord[]> {
  const formattedPostcode = formatPostcodeForQuery(postcode)

  const sparqlQuery = `
    PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>
    PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT ?transactionId ?amount ?date ?propertyType ?newBuild ?estateTenure
           ?paon ?saon ?street ?locality ?town ?district ?county ?postcode
    WHERE {
      ?transaction lrppi:pricePaid ?amount ;
                   lrppi:transactionDate ?date ;
                   lrppi:propertyType/rdfs:label ?propertyType ;
                   lrppi:newBuild ?newBuild ;
                   lrppi:estateType/rdfs:label ?estateTenure ;
                   lrppi:propertyAddress ?address .

      ?address lrcommon:postcode "${formattedPostcode}" ;
               lrcommon:paon ?paon ;
               lrcommon:street ?street ;
               lrcommon:town ?town ;
               lrcommon:county ?county .

      OPTIONAL { ?address lrcommon:saon ?saon }
      OPTIONAL { ?address lrcommon:locality ?locality }
      OPTIONAL { ?address lrcommon:district ?district }
      OPTIONAL { ?address lrcommon:postcode ?postcode }

      BIND(STR(?transaction) AS ?transactionId)
    }
    ORDER BY DESC(?date)
    LIMIT ${limit}
  `

  const response = await axios.get(SPARQL_ENDPOINT, {
    params: { query: sparqlQuery },
    headers: { Accept: 'application/sparql-results+json' },
  })

  const bindings = response.data?.results?.bindings ?? []

  return bindings.map((b: Record<string, { value: string }>) => ({
    transactionId: b.transactionId?.value ?? '',
    price: parseInt(b.amount?.value ?? '0', 10),
    date: b.date?.value ?? '',
    postcode: b.postcode?.value ?? formattedPostcode,
    propertyType: b.propertyType?.value ?? '',
    newBuild: b.newBuild?.value === 'true',
    estateTenure: b.estateTenure?.value ?? '',
    address: {
      paon: b.paon?.value ?? '',
      saon: b.saon?.value ?? '',
      street: b.street?.value ?? '',
      locality: b.locality?.value ?? '',
      town: b.town?.value ?? '',
      district: b.district?.value ?? '',
      county: b.county?.value ?? '',
    },
  }))
}

/**
 * Fetch price paid records for a specific address.
 * Filters by paon (house number/name) and street.
 */
export async function getPricePaidByAddress(
  postcode: string,
  paon: string,
  street: string
): Promise<PricePaidRecord[]> {
  const formattedPostcode = formatPostcodeForQuery(postcode)

  const sparqlQuery = `
    PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>
    PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>

    SELECT ?transactionId ?amount ?date ?propertyType ?newBuild ?estateTenure
           ?paon ?saon ?street ?locality ?town ?district ?county ?postcode
    WHERE {
      ?transaction lrppi:pricePaid ?amount ;
                   lrppi:transactionDate ?date ;
                   lrppi:propertyType/rdfs:label ?propertyType ;
                   lrppi:newBuild ?newBuild ;
                   lrppi:estateType/rdfs:label ?estateTenure ;
                   lrppi:propertyAddress ?address .

      ?address lrcommon:postcode "${formattedPostcode}" ;
               lrcommon:paon "${paon.toUpperCase()}" ;
               lrcommon:street "${street.toUpperCase()}" .

      OPTIONAL { ?address lrcommon:saon ?saon }
      OPTIONAL { ?address lrcommon:locality ?locality }
      OPTIONAL { ?address lrcommon:district ?district }
      OPTIONAL { ?address lrcommon:postcode ?postcode }

      BIND(STR(?transaction) AS ?transactionId)
    }
    ORDER BY DESC(?date)
  `

  const response = await axios.get(SPARQL_ENDPOINT, {
    params: { query: sparqlQuery },
    headers: { Accept: 'application/sparql-results+json' },
  })

  const bindings = response.data?.results?.bindings ?? []

  return bindings.map((b: Record<string, { value: string }>) => ({
    transactionId: b.transactionId?.value ?? '',
    price: parseInt(b.amount?.value ?? '0', 10),
    date: b.date?.value ?? '',
    postcode: b.postcode?.value ?? formattedPostcode,
    propertyType: b.propertyType?.value ?? '',
    newBuild: b.newBuild?.value === 'true',
    estateTenure: b.estateTenure?.value ?? '',
    address: {
      paon: b.paon?.value ?? '',
      saon: b.saon?.value ?? '',
      street: b.street?.value ?? '',
      locality: b.locality?.value ?? '',
      town: b.town?.value ?? '',
      district: b.district?.value ?? '',
      county: b.county?.value ?? '',
    },
  }))
}

// ─── UK House Price Index ─────────────────────────────────────────────────────

const HPI_ENDPOINT = 'https://landregistry.data.gov.uk/api/1'

/**
 * Fetch the most recent HPI data for a given region code.
 * Region codes: E12000001 (North East), E12000007 (London), etc.
 */
export async function getHPIByRegion(regionCode: string): Promise<HPIData | null> {
  try {
    const response = await axios.get(`${HPI_ENDPOINT}/hpi`, {
      params: {
        region: regionCode,
        '_sort': '-date',
        '_pageSize': 1,
        '_page': 0,
        '_properties': 'date,indice,changeMonth,changeAnnual,averagePrice',
      },
      headers: { Accept: 'application/json' },
    })
    const item = response.data?.result?.items?.[0]
    if (!item) return null
    return {
      date: item.date ?? '',
      indexValue: item.indice ?? 0,
      changeMonthly: item.changeMonth ?? 0,
      changeAnnual: item.changeAnnual ?? 0,
      averagePrice: item.averagePrice ?? 0,
      region: regionCode,
    }
  } catch {
    return null
  }
}

// ─── Valuation engine ─────────────────────────────────────────────────────────

/**
 * Map a postcode district to the nearest HPI region code.
 * This is a simplified mapping — expand for production.
 */
function postcodeToHPIRegion(postcode: string): string {
  const district = normalisePostcode(postcode).slice(0, 2).toUpperCase()
  const londonPrefixes = ['EC', 'WC', 'E', 'N', 'NW', 'SE', 'SW', 'W', 'BR', 'CR', 'DA', 'EN', 'HA', 'IG', 'KT', 'RM', 'SM', 'TW', 'UB', 'WD']
  if (londonPrefixes.some(p => district.startsWith(p))) return 'E12000007' // London
  if (['M', 'SK', 'OL', 'BL', 'WN', 'WA'].some(p => district.startsWith(p))) return 'E12000002' // North West
  if (['LS', 'BD', 'HX', 'HD', 'WF', 'HG', 'YO', 'DN'].some(p => district.startsWith(p))) return 'E12000003' // Yorkshire
  if (['B', 'CV', 'WV', 'WS', 'DY', 'ST'].some(p => district.startsWith(p))) return 'E12000005' // West Midlands
  if (['BS', 'BA', 'GL', 'SN', 'SP', 'RG', 'OX'].some(p => district.startsWith(p))) return 'E12000009' // South West
  if (['BN', 'TN', 'ME', 'CT', 'PO', 'SO', 'GU'].some(p => district.startsWith(p))) return 'E12000008' // South East
  return 'E92000001' // England fallback
}

/**
 * Estimate current property value based on last sale price + HPI growth.
 */
export async function getPropertyValuation(
  postcode: string,
  houseNumber: string,
  street: string
): Promise<PropertyValuation> {
  const [priceHistory, hpi] = await Promise.all([
    getPricePaidByAddress(postcode, houseNumber, street),
    getHPIByRegion(postcodeToHPIRegion(postcode)),
  ])

  const lastSale = priceHistory[0] ?? null
  let estimatedValue = 0
  let growthSinceLastSale: number | null = null

  if (lastSale && hpi) {
    // Apply HPI growth since the last sale date
    const saleDateYear = new Date(lastSale.date).getFullYear()
    const currentYear  = new Date().getFullYear()
    const yearsHeld    = currentYear - saleDateYear

    // Simple annual compound approximation using HPI
    const annualGrowthRate = (hpi.changeAnnual / 100) || 0.03
    const growthFactor = Math.pow(1 + annualGrowthRate, yearsHeld)
    estimatedValue = Math.round(lastSale.price * growthFactor)
    growthSinceLastSale = Math.round((growthFactor - 1) * 100)
  } else if (hpi) {
    estimatedValue = hpi.averagePrice
  }

  // ±15% confidence range
  const margin = estimatedValue * 0.15
  return {
    estimatedValue,
    estimatedValueLow:  Math.round(estimatedValue - margin),
    estimatedValueHigh: Math.round(estimatedValue + margin),
    lastSalePrice: lastSale?.price ?? null,
    lastSaleDate:  lastSale?.date  ?? null,
    priceHistory,
    currentHPI: hpi,
    growthSinceLastSale,
    postcode,
    propertyType: lastSale ? (PROPERTY_TYPE_MAP[lastSale.propertyType[0]] ?? lastSale.propertyType) : null,
  }
}

export { PROPERTY_TYPE_MAP, TENURE_MAP }
