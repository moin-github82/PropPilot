/**
 * Land Registry Price Paid Data API
 *
 * Provider  : HM Land Registry
 * Endpoint  : https://landregistry.data.gov.uk (SPARQL)
 * Auth      : None required — fully public
 * Docs      : https://landregistry.data.gov.uk/app/ppd
 */

import axios from 'axios'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PricePaidRecord {
  transactionId: string
  price:         number
  date:          string
  postcode:      string
  propertyType:  string   // D=Detached S=Semi-Detached T=Terraced F=Flat
  newBuild:      boolean
  estateTenure:  string   // F=Freehold L=Leasehold
  address: {
    paon:     string
    saon:     string
    street:   string
    locality: string
    town:     string
    district: string
    county:   string
  }
}

export interface HPIData {
  date:          string
  indexValue:    number
  changeMonthly: number
  changeAnnual:  number
  averagePrice:  number
  region:        string
}

export interface PropertyValuation {
  estimatedValue:      number
  estimatedValueLow:   number
  estimatedValueHigh:  number
  lastSalePrice:       number | null
  lastSaleDate:        string | null
  priceHistory:        PricePaidRecord[]
  currentHPI:          HPIData | null
  growthSinceLastSale: number | null
  postcode:            string
  propertyType:        string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const PROPERTY_TYPE_MAP: Record<string, string> = {
  D: 'Detached', S: 'Semi-Detached', T: 'Terraced', F: 'Flat / Maisonette',
}

export const TENURE_MAP: Record<string, string> = {
  F: 'Freehold', L: 'Leasehold',
}

function normalisePostcode(p: string): string {
  return p.replace(/\s/g, '').toUpperCase()
}

function formatPostcodeForQuery(p: string): string {
  const clean = normalisePostcode(p)
  return `${clean.slice(0, -3)} ${clean.slice(-3)}`
}

// ─── SPARQL endpoint ──────────────────────────────────────────────────────────

const SPARQL_ENDPOINT = 'https://landregistry.data.gov.uk/landregistry/query'

const SPARQL_PREFIXES = `
  PREFIX lrppi:    <http://landregistry.data.gov.uk/def/ppi/>
  PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>
  PREFIX rdfs:     <http://www.w3.org/2000/01/rdf-schema#>
  PREFIX owl:      <http://www.w3.org/2002/07/owl#>
  PREFIX xsd:      <http://www.w3.org/2001/XMLSchema#>
`

function mapBinding(b: Record<string, { value: string }>, fallbackPostcode: string): PricePaidRecord {
  return {
    transactionId: b.transactionId?.value ?? '',
    price:         parseInt(b.amount?.value  ?? '0', 10),
    date:          b.date?.value             ?? '',
    postcode:      b.postcode?.value         ?? fallbackPostcode,
    propertyType:  b.propertyType?.value     ?? '',
    newBuild:      b.newBuild?.value         === 'true',
    estateTenure:  b.estateTenure?.value     ?? '',
    address: {
      paon:     b.paon?.value     ?? '',
      saon:     b.saon?.value     ?? '',
      street:   b.street?.value   ?? '',
      locality: b.locality?.value ?? '',
      town:     b.town?.value     ?? '',
      district: b.district?.value ?? '',
      county:   b.county?.value   ?? '',
    },
  }
}

// ─── Price Paid by postcode ───────────────────────────────────────────────────

export async function getPricePaidByPostcode(
  postcode: string,
  limit = 10   // pass a higher value (e.g. 25) when the caller will filter by property type
): Promise<PricePaidRecord[]> {
  const fp = formatPostcodeForQuery(postcode)

  const query = `
    ${SPARQL_PREFIXES}
    SELECT ?transactionId ?amount ?date ?propertyType ?newBuild ?estateTenure
           ?paon ?saon ?street ?locality ?town ?district ?county ?postcode
    WHERE {
      ?transaction a lrppi:TransactionRecord ;
                   lrppi:pricePaid ?amount ;
                   lrppi:transactionDate ?date ;
                   lrppi:propertyType ?propertyTypeNode ;
                   lrppi:newBuild ?newBuild ;
                   lrppi:estateType ?estateTenureNode ;
                   lrppi:propertyAddress ?addr .

      ?propertyTypeNode rdfs:label ?propertyType .
      ?estateTenureNode rdfs:label ?estateTenure .

      ?addr lrcommon:postcode "${fp}"^^xsd:string .

      OPTIONAL { ?addr lrcommon:paon     ?paon     }
      OPTIONAL { ?addr lrcommon:saon     ?saon     }
      OPTIONAL { ?addr lrcommon:street   ?street   }
      OPTIONAL { ?addr lrcommon:locality ?locality }
      OPTIONAL { ?addr lrcommon:town     ?town     }
      OPTIONAL { ?addr lrcommon:district ?district }
      OPTIONAL { ?addr lrcommon:county   ?county   }
      OPTIONAL { ?addr lrcommon:postcode ?postcode }

      BIND(STR(?transaction) AS ?transactionId)
    }
    ORDER BY DESC(?date)
    LIMIT ${limit}
  `

  const response = await axios.get(SPARQL_ENDPOINT, {
    params:  { query },
    headers: { Accept: 'application/sparql-results+json' },
    timeout: 10000,
  })

  return (response.data?.results?.bindings ?? []).map(
    (b: Record<string, { value: string }>) => mapBinding(b, fp)
  )
}

// ─── Price Paid by specific address ──────────────────────────────────────────

export async function getPricePaidByAddress(
  postcode: string,
  paon:     string,
  street:   string
): Promise<PricePaidRecord[]> {
  const fp = formatPostcodeForQuery(postcode)

  const query = `
    ${SPARQL_PREFIXES}
    SELECT ?transactionId ?amount ?date ?propertyType ?newBuild ?estateTenure
           ?paon ?saon ?street ?locality ?town ?district ?county ?postcode
    WHERE {
      ?transaction a lrppi:TransactionRecord ;
                   lrppi:pricePaid ?amount ;
                   lrppi:transactionDate ?date ;
                   lrppi:propertyType ?propertyTypeNode ;
                   lrppi:newBuild ?newBuild ;
                   lrppi:estateType ?estateTenureNode ;
                   lrppi:propertyAddress ?addr .

      ?propertyTypeNode rdfs:label ?propertyType .
      ?estateTenureNode rdfs:label ?estateTenure .

      ?addr lrcommon:postcode "${fp}"^^xsd:string ;
            lrcommon:paon     "${paon.toUpperCase()}"^^xsd:string ;
            lrcommon:street   "${street.toUpperCase()}"^^xsd:string .

      OPTIONAL { ?addr lrcommon:saon     ?saon     }
      OPTIONAL { ?addr lrcommon:locality ?locality }
      OPTIONAL { ?addr lrcommon:district ?district }
      OPTIONAL { ?addr lrcommon:postcode ?postcode }

      BIND(STR(?transaction) AS ?transactionId)
    }
    ORDER BY DESC(?date)
  `

  const response = await axios.get(SPARQL_ENDPOINT, {
    params:  { query },
    headers: { Accept: 'application/sparql-results+json' },
    timeout: 10000,
  })

  return (response.data?.results?.bindings ?? []).map(
    (b: Record<string, { value: string }>) => mapBinding(b, fp)
  )
}

// ─── HPI ──────────────────────────────────────────────────────────────────────

const HPI_ENDPOINT = 'https://landregistry.data.gov.uk/api/1'

export async function getHPIByRegion(regionCode: string): Promise<HPIData | null> {
  try {
    const response = await axios.get(`${HPI_ENDPOINT}/hpi`, {
      params: {
        region:      regionCode,
        '_sort':     '-date',
        '_pageSize': 1,
        '_page':     0,
      },
      headers: { Accept: 'application/json' },
      timeout: 8000,
    })
    const item = response.data?.result?.items?.[0]
    if (!item) return null
    return {
      date:          item.date          ?? '',
      indexValue:    item.indice        ?? 0,
      changeMonthly: item.changeMonth   ?? 0,
      changeAnnual:  item.changeAnnual  ?? 0,
      averagePrice:  item.averagePrice  ?? 0,
      region:        regionCode,
    }
  } catch {
    return null
  }
}

// ─── Postcode → HPI region ────────────────────────────────────────────────────

function postcodeToHPIRegion(postcode: string): string {
  const d = normalisePostcode(postcode).slice(0, 2).toUpperCase()
  const london = ['EC','WC','E','N','NW','SE','SW','W','BR','CR','DA','EN','HA','IG','KT','RM','SM','TW','UB','WD']
  if (london.some(p => d.startsWith(p))) return 'E12000007'
  if (['M','SK','OL','BL','WN','WA'].some(p => d.startsWith(p))) return 'E12000002'
  if (['LS','BD','HX','HD','WF','HG','YO','DN'].some(p => d.startsWith(p))) return 'E12000003'
  if (['B','CV','WV','WS','DY','ST'].some(p => d.startsWith(p))) return 'E12000005'
  if (['BS','BA','GL','SN','SP','RG','OX'].some(p => d.startsWith(p))) return 'E12000009'
  if (['BN','TN','ME','CT','PO','SO','GU'].some(p => d.startsWith(p))) return 'E12000008'
  return 'E92000001'
}

// ─── Property valuation ───────────────────────────────────────────────────────

export async function getPropertyValuation(
  postcode:    string,
  houseNumber: string,
  street:      string
): Promise<PropertyValuation> {
  const [priceHistory, hpi] = await Promise.all([
    getPricePaidByAddress(postcode, houseNumber, street),
    getHPIByRegion(postcodeToHPIRegion(postcode)),
  ])

  const lastSale = priceHistory[0] ?? null
  let estimatedValue = 0
  let growthSinceLastSale: number | null = null

  if (lastSale && hpi) {
    const yearsHeld     = new Date().getFullYear() - new Date(lastSale.date).getFullYear()
    const annualGrowth  = (hpi.changeAnnual / 100) || 0.03
    const growthFactor  = Math.pow(1 + annualGrowth, yearsHeld)
    estimatedValue      = Math.round(lastSale.price * growthFactor)
    growthSinceLastSale = Math.round((growthFactor - 1) * 100)
  } else if (hpi) {
    estimatedValue = hpi.averagePrice
  }

  const margin = estimatedValue * 0.15
  return {
    estimatedValue,
    estimatedValueLow:   Math.round(estimatedValue - margin),
    estimatedValueHigh:  Math.round(estimatedValue + margin),
    lastSalePrice:       lastSale?.price ?? null,
    lastSaleDate:        lastSale?.date  ?? null,
    priceHistory,
    currentHPI:          hpi,
    growthSinceLastSale,
    postcode,
    propertyType:        lastSale ? (PROPERTY_TYPE_MAP[lastSale.propertyType[0]] ?? lastSale.propertyType) : null,
  }
}
