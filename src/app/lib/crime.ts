/**
 * Crime Statistics — Police.uk API
 *
 * Provider : data.police.uk
 * Auth     : None — fully public, no key required
 * Docs     : https://data.police.uk/docs/
 *
 * Fetches street-level crime within ~1 mile radius for the last 3 months.
 */

import axios from 'axios'
import type { GeocodeResult } from './geocode'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CrimeCategory {
  category: string
  count:    number
}

export interface CrimeSummary {
  totalIncidents:    number
  monthsAnalysed:    number
  incidentsPerMonth: number
  topCategories:     CrimeCategory[]
  dataDate:          string   // Most recent month of data, e.g. "2024-10"
}

// ─── Category labels ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  'anti-social-behaviour':    'Anti-social behaviour',
  'bicycle-theft':            'Bicycle theft',
  'burglary':                 'Burglary',
  'criminal-damage-arson':    'Criminal damage & arson',
  'drugs':                    'Drugs',
  'other-crime':              'Other crime',
  'other-theft':              'Other theft',
  'possession-of-weapons':    'Possession of weapons',
  'public-order':             'Public order',
  'robbery':                  'Robbery',
  'shoplifting':              'Shoplifting',
  'theft-from-the-person':    'Theft from the person',
  'vehicle-crime':            'Vehicle crime',
  'violent-crime':            'Violence & sexual offences',
  'violence-and-sexual-offences': 'Violence & sexual offences',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns YYYY-MM strings for the last N months, accounting for ~2-month API lag */
function getRecentMonths(n: number): string[] {
  const months: string[] = []
  const d = new Date()
  d.setMonth(d.getMonth() - 2) // Police API typically has a 2-month publication lag
  for (let i = 0; i < n; i++) {
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    )
    d.setMonth(d.getMonth() - 1)
  }
  return months
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function getCrimeData(geo: GeocodeResult): Promise<CrimeSummary | null> {
  try {
    const months = getRecentMonths(3)

    // Fetch all months in parallel — Police API is slow so cap at 3
    const monthResults = await Promise.all(
      months.map(date =>
        axios
          .get<{ category: string }[]>(
            'https://data.police.uk/api/crimes-street/all-crime',
            {
              params:  { lat: geo.latitude, lng: geo.longitude, date },
              timeout: 10000,
            }
          )
          .then(r => r.data ?? [])
          .catch(() => [] as { category: string }[])
      )
    )

    const allCrimes = monthResults.flat()
    if (!allCrimes.length) return null

    // Tally by human-readable category
    const tally: Record<string, number> = {}
    for (const crime of allCrimes) {
      const label = CATEGORY_LABELS[crime.category] ?? crime.category
      tally[label] = (tally[label] ?? 0) + 1
    }

    const topCategories = Object.entries(tally)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }))

    return {
      totalIncidents:    allCrimes.length,
      monthsAnalysed:    months.length,
      incidentsPerMonth: Math.round(allCrimes.length / months.length),
      topCategories,
      dataDate:          months[0],
    }
  } catch {
    return null
  }
}
