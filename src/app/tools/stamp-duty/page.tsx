'use client'

import { useState, useCallback } from 'react'
import { SiteNav } from '../../components/SiteNav'
import { Footer } from '../../components/Footer'

// ─── SDLT calculation engine ──────────────────────────────────────────────────

type BuyerType = 'firstTime' | 'movedHome' | 'additionalProperty'

interface SDLTResult {
  total:      number
  effective:  number   // effective rate %
  breakdown:  { band: string; rate: string; taxable: number; tax: number }[]
  savings:    number   // saving vs standard rate (for FTB)
  notes:      string[]
}

const STANDARD_BANDS = [
  { from: 0,         to: 250_000,   rate: 0    },
  { from: 250_000,   to: 925_000,   rate: 0.05 },
  { from: 925_000,   to: 1_500_000, rate: 0.10 },
  { from: 1_500_000, to: Infinity,  rate: 0.12 },
]

const FTB_BANDS = [
  { from: 0,         to: 425_000,   rate: 0    },
  { from: 425_000,   to: 625_000,   rate: 0.05 },
  // Above £625k FTB relief is lost — revert to standard
  { from: 625_000,   to: 925_000,   rate: 0.05 },
  { from: 925_000,   to: 1_500_000, rate: 0.10 },
  { from: 1_500_000, to: Infinity,  rate: 0.12 },
]

const ADDITIONAL_SURCHARGE = 0.03

function calcSDLT(price: number, buyerType: BuyerType): SDLTResult {
  const notes: string[] = []
  let bands = STANDARD_BANDS

  if (buyerType === 'firstTime') {
    if (price <= 625_000) {
      bands = FTB_BANDS.slice(0, 2)
      notes.push('First-time buyer relief applied (0% up to £425,000, 5% on the portion up to £625,000).')
    } else {
      notes.push('First-time buyer relief does not apply above £625,000 — standard rates used.')
    }
  }

  if (buyerType === 'additionalProperty') {
    notes.push('3% surcharge applied for additional/buy-to-let property.')
  }

  const breakdown: SDLTResult['breakdown'] = []
  let total = 0

  for (const band of bands) {
    const taxable = Math.max(0, Math.min(price, band.to) - band.from)
    if (taxable <= 0) continue
    const effectiveRate = band.rate + (buyerType === 'additionalProperty' ? ADDITIONAL_SURCHARGE : 0)
    const tax = Math.round(taxable * effectiveRate)
    total += tax
    breakdown.push({
      band:    `£${band.from.toLocaleString()} – ${band.to === Infinity ? 'above' : '£' + band.to.toLocaleString()}`,
      rate:    `${((effectiveRate) * 100).toFixed(0)}%`,
      taxable: Math.round(taxable),
      tax,
    })
  }

  // Calculate standard-rate SDLT to show FTB saving
  let standardTotal = 0
  if (buyerType === 'firstTime' && price <= 625_000) {
    for (const band of STANDARD_BANDS) {
      const taxable = Math.max(0, Math.min(price, band.to) - band.from)
      standardTotal += Math.round(taxable * band.rate)
    }
  }

  return {
    total,
    effective: price > 0 ? Math.round((total / price) * 10000) / 100 : 0,
    breakdown,
    savings:   Math.max(0, standardTotal - total),
    notes,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StampDutyPage() {
  const [price,     setPrice]     = useState('')
  const [buyerType, setBuyerType] = useState<BuyerType>('movedHome')
  const [result,    setResult]    = useState<SDLTResult | null>(null)

  const calculate = useCallback(() => {
    const p = parseFloat(price.replace(/,/g, ''))
    if (!p || p <= 0) return
    setResult(calcSDLT(p, buyerType))
  }, [price, buyerType])

  const fmt = (n: number) => `£${n.toLocaleString()}`

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 48, padding: '0 14px', fontSize: 15,
    border: '1.5px solid #e2ddd6', borderRadius: 10,
    background: '#fff', color: '#1a1917', fontFamily: 'var(--font-body)',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', display: 'flex', flexDirection: 'column' }}>
      <SiteNav />

      <main style={{ maxWidth: 600, margin: '0 auto', padding: 'clamp(32px,5vw,56px) clamp(16px,4vw,40px) 80px' }}>
        <div style={{ marginBottom: 36 }}>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9e998f', display: 'block', marginBottom: 10 }}>Free calculator</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,4vw,38px)', fontWeight: 500, color: '#1a1917', marginBottom: 10 }}>Stamp Duty Calculator</h1>
          <p style={{ fontSize: 15, color: '#5e5a52', lineHeight: 1.7, margin: 0 }}>
            Calculate your Stamp Duty Land Tax (SDLT) for England and Northern Ireland. Includes first-time buyer relief and the 3% additional property surcharge.
          </p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 16, padding: '28px', marginBottom: 16 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#5e5a52', display: 'block', marginBottom: 6 }}>Property price</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#9e998f' }}>£</span>
              <input
                type="number" value={price} onChange={e => setPrice(e.target.value)}
                placeholder="425000" style={{ ...inputStyle, paddingLeft: 28 }}
                min={0}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#5e5a52', display: 'block', marginBottom: 10 }}>Buyer type</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([
                ['firstTime',         'First-time buyer',          'Relief applies up to £625,000 — pay 0% on first £425,000'],
                ['movedHome',         'Moving home',               'Standard SDLT rates apply'],
                ['additionalProperty','Additional / buy-to-let',   '3% surcharge on top of standard rates'],
              ] as [BuyerType, string, string][]).map(([type, label, desc]) => (
                <label key={type} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${buyerType === type ? '#1D9E75' : '#e2ddd6'}`, background: buyerType === type ? '#f0fdf4' : '#fff', cursor: 'pointer' }}>
                  <input type="radio" name="buyerType" value={type} checked={buyerType === type} onChange={() => setBuyerType(type)} style={{ marginTop: 2, accentColor: '#1D9E75', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1917', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 12, color: '#5e5a52', margin: 0 }}>{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={calculate}
            style={{ width: '100%', height: 48, fontSize: 15, fontWeight: 500, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >
            Calculate stamp duty
          </button>
        </div>

        {result && (
          <div style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 16, padding: '28px' }}>
            {/* Total */}
            <div style={{ textAlign: 'center', padding: '20px 0 24px', borderBottom: '1px solid #f0ede8' }}>
              <p style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9e998f', margin: '0 0 8px' }}>Stamp duty to pay</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 500, color: '#1a1917', margin: '0 0 4px' }}>{fmt(result.total)}</p>
              <p style={{ fontSize: 14, color: '#5e5a52', margin: 0 }}>Effective rate: {result.effective}%</p>
              {result.savings > 0 && (
                <div style={{ marginTop: 12, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 16px', display: 'inline-block' }}>
                  <p style={{ fontSize: 13, color: '#14532d', margin: 0, fontWeight: 500 }}>
                    First-time buyer saving: {fmt(result.savings)}
                  </p>
                </div>
              )}
            </div>

            {/* Breakdown */}
            <div style={{ paddingTop: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9e998f', margin: '0 0 14px' }}>Tax breakdown</p>
              {result.breakdown.map((row, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: i < result.breakdown.length - 1 ? '1px solid #f0ede8' : 'none' }}>
                  <div>
                    <p style={{ fontSize: 13, color: '#1a1917', margin: 0 }}>{row.band}</p>
                    <p style={{ fontSize: 11, color: '#9e998f', margin: 0 }}>Taxable: {fmt(row.taxable)}</p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#5e5a52', background: '#f8f7f4', padding: '2px 8px', borderRadius: 6 }}>{row.rate}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1917', textAlign: 'right' }}>{fmt(row.tax)}</span>
                </div>
              ))}
            </div>

            {/* Notes */}
            {result.notes.length > 0 && (
              <div style={{ marginTop: 20, padding: '14px 16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8 }}>
                {result.notes.map((note, i) => (
                  <p key={i} style={{ fontSize: 12, color: '#451a03', margin: i < result.notes.length - 1 ? '0 0 6px' : 0, lineHeight: 1.6 }}>{note}</p>
                ))}
              </div>
            )}

            <p style={{ fontSize: 11, color: '#9e998f', margin: '16px 0 0', lineHeight: 1.6 }}>
              Rates correct for England and Northern Ireland as of April 2025. Scotland uses LBTT; Wales uses LTT. Always confirm with your conveyancer before exchange.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}