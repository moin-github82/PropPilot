/**
 * Broadband Coverage — Ofcom Connected Nations API
 *
 * Provider : Ofcom (Office of Communications)
 * Portal   : https://api.ofcom.org.uk
 * Endpoint : https://api-proxy.ofcom.org.uk/broadband/coverage/{postcode}
 * Auth     : Azure API Management subscription key — passed as header
 *            "Ocp-Apim-Subscription-Key: {key}"
 *
 * How to get your key:
 *  1. Register at api.ofcom.org.uk
 *  2. Go to Products → subscribe to "Broadband Coverage"
 *  3. Go to Profile → Subscriptions → reveal "Primary key"
 *  4. Add to .env.local:  OFCOM_SUBSCRIPTION_KEY=your_key_here
 *
 * Docs: https://api.ofcom.org.uk/docs/services/ofcom-connected-nations-broadband-api
 */

import axios from 'axios'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BroadbandCoverage {
  /** Fastest technology available at the premises */
  technologyType:  'FTTP' | 'FTTC' | 'Cable' | 'ADSL' | 'Unknown'
  /** Max download speed in Mbps */
  maxDownloadMbps: number
  /** Max upload speed in Mbps */
  maxUploadMbps:   number
  /** Full-fibre (gigabit-capable) available */
  gigabitCapable:  boolean
  /** Superfast (≥30 Mbps download) available */
  superfast:       boolean
  /** Ultrafast (≥300 Mbps download) available */
  ultrafast:       boolean
  /** 4G outdoor coverage */
  coverage4G:      boolean
  /** 5G outdoor coverage */
  coverage5G:      boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isOfcomConfigured(): boolean {
  return !!process.env.OFCOM_SUBSCRIPTION_KEY
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function getBroadbandCoverage(postcode: string): Promise<BroadbandCoverage | null> {
  const key = process.env.OFCOM_SUBSCRIPTION_KEY
  if (!key) return null

  try {
    const clean = postcode.replace(/\s/g, '').toUpperCase()

    const response = await axios.get(
      `https://api-proxy.ofcom.org.uk/broadband/coverage/${encodeURIComponent(clean)}`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Accept': 'application/json',
        },
        timeout: 8000,
      }
    )

    const d = response.data

    // Ofcom response fields (Connected Nations API schema)
    // UFBBAvailability = ultrafast full fibre; SFBBAvailability = superfast
    const fttp       = d?.UFBBAvailability === 'Y' || d?.GigabitAvailability === 'Y'
    const fttc       = d?.SFBBAvailability === 'Y'
    const maxDown    = d?.MaxDownloadSpeed ?? d?.maxDownloadSpeed ?? (fttp ? 1000 : fttc ? 80 : 10)
    const maxUp      = d?.MaxUploadSpeed   ?? d?.maxUploadSpeed   ?? (fttp ? 100 : fttc ? 20 : 1)

    const techType: BroadbandCoverage['technologyType'] =
      fttp     ? 'FTTP'
      : (d?.CableAvailability === 'Y') ? 'Cable'
      : fttc   ? 'FTTC'
      : maxDown > 0 ? 'ADSL'
      : 'Unknown'

    return {
      technologyType:  techType,
      maxDownloadMbps: maxDown,
      maxUploadMbps:   maxUp,
      gigabitCapable:  fttp,
      superfast:       maxDown >= 30,
      ultrafast:       maxDown >= 300,
      coverage4G:      d?.['4GAvailability'] === 'Y' || d?.coverage4G === 'Y',
      coverage5G:      d?.['5GAvailability'] === 'Y' || d?.coverage5G === 'Y',
    }
  } catch {
    return null
  }
}
