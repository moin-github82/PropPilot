'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { NavBar } from '../../components/NavBar'

// ─── Lease extension calculation (Leasehold Reform Act 1993) ──────────────────
//
// The statutory formula has two components:
//  1. Ground rent capitalisation — the value of future ground rent
//  2. Marriage value — 50% of the increase in value from extending
//     (only applies when lease < 80 years remaining)
//
// This is a simplified estimate. Actual premiums depend on a tribunal valuation.

interface LeaseResult {
  groundRentCap:   number
  marriageValue:   number
  premium:         number
  solicitorCosts:  number
  valuationCosts:  number
  totalCost:       number
  warningBelow80:  boolean
  notes:           string[]
}

const DEFERMENT_RATE = 0.05  // 5% — UTTT standard deferment rate (Sportelli)
const CAPITALISATION_RATE = 0.06  // 6% — typical for low ground rents

function calcLeaseExtension(
  propertyValue: number,
  currentLease:  number,
  groundRent:    number,
  newLeaseYears: number = 90
): LeaseResult {
  const notes: string[] = []

  // 1. Ground rent capitalisation — PV of ground rent over remaining lease
  //    Using Years Purchase (Parry's tables approximation)
  const groundRentCap = groundRent > 0
    ? groundRent * (1 - Math.pow(1 + CAPITALISATION_RATE, -currentLease)) / CAPITALISATION_RATE
    : 0

  // 2. Reversion — PV of freehold value at end of current lease
  const reversion = propertyValue * Math.pow(1 + DEFERMENT_RATE, -currentLease)

  // 3. Marriage value (only when lease < 80 years)
  const warningBelow80 = currentLease < 80
  let marriageValue = 0

  if (warningBelow80) {
    // Simplified: marriage value ≈ increase in long-leasehold value × 50%
    // With a short lease, the property is worth roughly (lease/90) of its freehold value
    const shortLeaseDiscount = Math.min(1, currentLease / 125)
    const valueLoss = propertyValue * (1 - shortLeaseDiscount)
    marriageValue = valueLoss * 0.5
    notes.push(`Marriage value applies because the lease has fewer than 80 years remaining — this significantly increases the premium.`)
  }

  const premium = Math.round(groundRentCap + reversion + marriageValue)

  if (currentLease < 80) {
    notes.push('Act before the lease drops below 80 years — marriage value doubles the cost once below this threshold.')
  }
  if (currentLease < 60) {
    notes.push('With fewer than 60 years remaining, mortgage lenders may restrict lending on this property.')
  }
  if (newLeaseYears === 90) {
    notes.push('A 90-year extension is the statutory entitlement (added to current term) and brings the lease to a peppercorn ground rent.')
  }

  return {
    groundRentCap: Math.round(groundRentCap),
    marriageValue:  Math.round(marriageValue),
    premium,
    solicitorCosts: 1500,    // Typical leaseholder solicitor + freeholder costs
    valuationCosts: 700,     // RICS valuer fee
    totalCost:      premium + 1500 + 700,
    warningBelow80,
    notes,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeaseExtensionPage() {
  const [propertyValue, setPropertyValue] = useState('')
  const [currentLease,  setCurrentLease]  = useState('')
  const [groundRent,    setGroundRent]     = useState('')
  const [result,        setResult]         = useState<LeaseResult | null>(null)

  const calculate = useCallback(() => {
    const pv = parseFloat(propertyValue.replace(/,/g, ''))
    const cl = parseFloat(currentLease)
    const gr = parseFloat(groundRent) || 0
    if (!pv || !cl || cl <= 0 || cl > 999) return
    setResult(calcLeaseExtension(pv, cl, gr))
  }, [propertyValue, currentLease, groundRent])

  const fmt = (n: number) => `£${n.toLocaleString()}`

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 48, padding: '0 14px', fontSize: 15,
    border: '1.5px solid #e2ddd6', borderRadius: 10,
    background: '#fff', color: '#1a1917', fontFamily: 'var(--font-body)',
    outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#5e5a52', display: 'block', marginBottom: 6 }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4' }}>
      <NavBar
        rightSlot={<Link href="/tools" style={{ fontSize: 13, color: '#5e5a52', textDecoration: 'none' }}>← Back to tools</Link>}
        mobileItems={[{ label: '← Back to tools', href: '/tools' }]}
      />

      <main style={{ maxWidth: 640, margin: '0 auto', padding: 'clamp(32px,5vw,56px) clamp(16px,4vw,40px) 80px' }}>
        <div style={{ marginBottom: 36 }}>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9e998f', display: 'block', marginBottom: 10 }}>Free calculator</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,4vw,38px)', fontWeight: 500, color: '#1a1917', marginBottom: 10 }}>Lease Extension Calculator</h1>
          <p style={{ fontSize: 15, color: '#5e5a52', lineHeight: 1.7, margin: 0 }}>
            Estimate your statutory lease extension premium under the Leasehold Reform, Housing and Urban Development Act 1993. Results are indicative — instruct a RICS surveyor for a formal valuation.
          </p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 16, padding: '28px', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Property value (£)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#9e998f' }}>£</span>
                <input type="number" value={propertyValue} onChange={e => setPropertyValue(e.target.value)} placeholder="350000" style={{ ...inputStyle, paddingLeft: 28 }} min={0} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Years remaining on lease</label>
              <input type="number" value={currentLease} onChange={e => setCurrentLease(e.target.value)} placeholder="72" style={inputStyle} min={1} max={999} />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Annual ground rent (£) — 0 if peppercorn</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#9e998f' }}>£</span>
              <input type="number" value={groundRent} onChange={e => setGroundRent(e.target.value)} placeholder="250" style={{ ...inputStyle, paddingLeft: 28 }} min={0} />
            </div>
          </div>

          {/* Warning if lease < 80 */}
          {currentLease && parseFloat(currentLease) < 80 && (
            <div style={{ background: '#fff1f2', border: '1px solid #fda4af', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#9f1239', margin: '0 0 4px' }}>⚠ Lease below 80 years</p>
              <p style={{ fontSize: 12, color: '#4c0519', margin: 0, lineHeight: 1.6 }}>
                Marriage value applies, significantly increasing the premium. Act now — every year below 80 gets more expensive.
              </p>
            </div>
          )}

          <button onClick={calculate} style={{ width: '100%', height: 48, fontSize: 15, fontWeight: 500, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Estimate premium
          </button>
        </div>

        {result && (
          <div style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 16, padding: '28px' }}>
            <div style={{ textAlign: 'center', padding: '16px 0 24px', borderBottom: '1px solid #f0ede8' }}>
              <p style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9e998f', margin: '0 0 8px' }}>Estimated total cost</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 500, color: '#1a1917', margin: '0 0 4px' }}>{fmt(result.totalCost)}</p>
              <p style={{ fontSize: 13, color: '#5e5a52', margin: 0 }}>Premium {fmt(result.premium)} + legal & valuation costs ~{fmt(result.solicitorCosts + result.valuationCosts)}</p>
            </div>

            <div style={{ paddingTop: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9e998f', margin: '0 0 14px' }}>Premium breakdown</p>
              {[
                { label: 'Ground rent capitalisation', value: result.groundRentCap, note: 'PV of ground rent over remaining lease' },
                { label: 'Reversion', value: result.premium - result.groundRentCap - result.marriageValue, note: 'PV of freehold value at end of lease' },
                ...(result.marriageValue > 0 ? [{ label: 'Marriage value (50%)', value: result.marriageValue, note: 'Applies because lease < 80 years' }] : []),
              ].map((row, i, arr) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid #f0ede8' : 'none' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1917', margin: 0 }}>{row.label}</p>
                    <p style={{ fontSize: 11, color: '#9e998f', margin: 0 }}>{row.note}</p>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1917' }}>{fmt(row.value)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', borderTop: '2px solid #e2ddd6', marginTop: 4 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1917', margin: 0 }}>Statutory premium</p>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1917' }}>{fmt(result.premium)}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
                <div style={{ background: '#f8f7f4', borderRadius: 8, padding: '12px 14px' }}>
                  <p style={{ fontSize: 11, color: '#9e998f', margin: '0 0 4px' }}>Your solicitor fees (est.)</p>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1917', margin: 0 }}>{fmt(result.solicitorCosts)}</p>
                </div>
                <div style={{ background: '#f8f7f4', borderRadius: 8, padding: '12px 14px' }}>
                  <p style={{ fontSize: 11, color: '#9e998f', margin: '0 0 4px' }}>RICS valuation (est.)</p>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1917', margin: 0 }}>{fmt(result.valuationCosts)}</p>
                </div>
              </div>
            </div>

            {result.notes.length > 0 && (
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.notes.map((note, i) => (
                  <div key={i} style={{ background: result.warningBelow80 ? '#fff1f2' : '#fffbeb', border: `1px solid ${result.warningBelow80 ? '#fda4af' : '#fcd34d'}`, borderRadius: 8, padding: '10px 12px' }}>
                    <p style={{ fontSize: 12, color: result.warningBelow80 ? '#4c0519' : '#451a03', margin: 0, lineHeight: 1.6 }}>{note}</p>
                  </div>
                ))}
              </div>
            )}

            <p style={{ fontSize: 11, color: '#9e998f', margin: '16px 0 0', lineHeight: 1.6 }}>
              This is an estimate only. The actual premium is determined by a RICS-qualified surveyor using Parry&apos;s Valuation Tables. You must have owned the flat for at least 2 years to qualify for the statutory right.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
