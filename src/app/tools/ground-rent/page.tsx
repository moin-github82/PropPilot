'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SiteNav } from '../../components/SiteNav'
import { Footer } from '../../components/Footer'

function fmtGBP(n: number): string {
  return '£' + Math.round(n).toLocaleString('en-GB')
}

type EscalationType = 'doubling' | 'rpi' | 'fixed' | 'stepped'

function projectDoubling(start: number, interval: number, years: number): number {
  return start * Math.pow(2, Math.floor(years / interval))
}

function projectRPI(start: number, avgRpi: number, years: number): number {
  return start * Math.pow(1 + avgRpi / 100, years)
}

function projectStepped(start: number, stepAmount: number, stepEvery: number, years: number): number {
  return start + stepAmount * Math.floor(years / stepEvery)
}

export default function GroundRentPage() {
  const [currentRent,    setCurrentRent]    = useState('')
  const [escalationType, setEscalationType] = useState<EscalationType>('doubling')
  const [doubleEvery,    setDoubleEvery]    = useState('10')
  const [avgRPI,         setAvgRPI]         = useState('3.0')
  const [stepAmount,     setStepAmount]     = useState('')
  const [stepEvery,      setStepEvery]      = useState('5')
  const [propertyValue,  setPropertyValue]  = useState('')
  const [result,         setResult]         = useState<null | {
    start: number
    projections: { year: number; rent: number; asPercentValue: number | null; lenderFlag: boolean }[]
    verdict: 'pass' | 'warning' | 'fail'
    verdictLabel: string
    verdictDetail: string
  }>(null)

  const LENDER_THRESHOLD_PCT = 0.1  // 0.1% of value = typical lender limit

  function handleCalculate(e: React.FormEvent) {
    e.preventDefault()
    const start = parseFloat(currentRent)
    const pv    = parseFloat(propertyValue) || null
    if (!start || start <= 0) return

    const years = [1, 5, 10, 15, 20, 30, 40, 50]

    const projections = years.map(y => {
      let rent: number
      if (escalationType === 'doubling') {
        rent = projectDoubling(start, parseInt(doubleEvery) || 10, y)
      } else if (escalationType === 'rpi') {
        rent = projectRPI(start, parseFloat(avgRPI) || 3, y)
      } else if (escalationType === 'stepped') {
        rent = projectStepped(start, parseFloat(stepAmount) || 50, parseInt(stepEvery) || 5, y)
      } else {
        rent = start  // fixed
      }

      const asPercentValue = pv ? (rent / pv) * 100 : null
      // Lender flags: many refuse >0.1% of value, or where rent > £250/yr (if doubling)
      const lenderFlag = (asPercentValue !== null && asPercentValue > LENDER_THRESHOLD_PCT)
        || (escalationType === 'doubling' && rent > 250)
        || (escalationType !== 'fixed' && rent > 1000)

      return { year: y, rent, asPercentValue, lenderFlag }
    })

    // Verdict
    let verdict: 'pass' | 'warning' | 'fail' = 'pass'
    let verdictLabel = ''
    let verdictDetail = ''

    if (escalationType === 'doubling') {
      verdict = 'fail'
      verdictLabel = 'Toxic — doubling clause'
      verdictDetail = `A ground rent that doubles every ${doubleEvery} years is one of the most damaging leasehold terms. Halifax, Nationwide, Barclays and most major lenders refuse to mortgage properties with this clause. The property will be effectively unmortgageable — and almost unsellable — within ${parseInt(doubleEvery) * 2}–${parseInt(doubleEvery) * 3} years unless the lease is varied.`
    } else if (escalationType === 'rpi') {
      const rent20 = projectRPI(start, parseFloat(avgRPI) || 3, 20)
      if (pv && (rent20 / pv) * 100 > 0.1) {
        verdict = 'warning'
        verdictLabel = 'Caution — RPI growth may breach lender limits'
        verdictDetail = `At ${avgRPI}% average RPI, the ground rent reaches ${fmtGBP(rent20)}/year in 20 years${pv ? ` (${((rent20 / pv) * 100).toFixed(2)}% of property value)` : ''}. This may exceed mortgage lender thresholds. Confirm your lender accepts RPI-linked ground rent before proceeding.`
      } else {
        verdict = 'warning'
        verdictLabel = 'Moderate risk — RPI-linked'
        verdictDetail = `RPI-linked ground rent is less dangerous than a doubling clause but still increases over time. During high-inflation periods (2022–23 saw RPI above 12%) rent can rise sharply in a single year. Most but not all lenders will accept RPI-linked ground rent.`
      }
    } else if (escalationType === 'stepped') {
      const rent20 = projectStepped(start, parseFloat(stepAmount) || 50, parseInt(stepEvery) || 5, 20)
      if (pv && (rent20 / pv) * 100 > 0.1) {
        verdict = 'warning'
        verdictLabel = 'Caution — may breach lender limits in future'
        verdictDetail = `Stepped increases of ${fmtGBP(parseFloat(stepAmount) || 50)} every ${stepEvery} years take the rent to ${fmtGBP(rent20)}/year in 20 years. If this exceeds 0.1% of property value (${pv ? fmtGBP(pv * 0.001) : 'unknown'}) lenders may refuse to mortgage.`
      } else {
        verdict = 'pass'
        verdictLabel = 'Acceptable — fixed step increases'
        verdictDetail = `Stepped ground rent with predictable fixed increases is generally acceptable to most lenders, provided total rent stays below 0.1% of property value.`
      }
    } else {
      // fixed
      if (pv && (start / pv) * 100 > 0.1) {
        verdict = 'warning'
        verdictLabel = 'Caution — current rent above lender threshold'
        verdictDetail = `Fixed ground rent of ${fmtGBP(start)}/year represents ${((start / pv) * 100).toFixed(2)}% of property value — above the typical 0.1% threshold that many lenders use. Confirm mortgage eligibility before proceeding.`
      } else {
        verdict = 'pass'
        verdictLabel = 'Acceptable — fixed ground rent'
        verdictDetail = 'Fixed ground rent with no escalation clause is the safest type and is acceptable to all major lenders, provided the amount is below 0.1% of property value.'
      }
    }

    setResult({ start, projections, verdict, verdictLabel, verdictDetail })
  }

  const verdictColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    pass:    { bg: '#f0fdf4', border: '#86efac', text: '#14532d', badge: '#dcfce7' },
    warning: { bg: '#fffbeb', border: '#fcd34d', text: '#78350f', badge: '#fef3c7' },
    fail:    { bg: '#fef2f2', border: '#fca5a5', text: '#7f1d1d', badge: '#fee2e2' },
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 44, padding: '0 14px', fontSize: 15,
    border: '1.5px solid var(--slate-200)', borderRadius: 'var(--radius-md)',
    background: '#fff', color: 'var(--slate-800)', outline: 'none',
    fontFamily: 'var(--font-body)',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 500, color: 'var(--slate-600)', display: 'block', marginBottom: 6,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', display: 'flex', flexDirection: 'column' }}>
      <SiteNav />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(28px,5vw,52px) clamp(16px,4vw,32px) 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <Link href="/tools" style={{ fontSize: 13, color: 'var(--brand-400)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
            ← All tools
          </Link>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#dc2626', display: 'block', marginBottom: 10 }}>
            Leasehold
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,4vw,40px)', fontWeight: 500, color: 'var(--slate-900)', marginBottom: 12 }}>
            Ground Rent Trap Analyser
          </h1>
          <p style={{ fontSize: 16, color: 'var(--slate-500)', lineHeight: 1.7, maxWidth: 560, margin: 0 }}>
            See how your ground rent grows over time — and whether it will block you from remortgaging or selling. A £250/year doubling rent becomes £4,000/year in 40 years.
          </p>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: 28, marginBottom: 28 }}>
          <form onSubmit={handleCalculate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Current annual ground rent (£) *</label>
                <input style={inputStyle} type="number" required min={0} value={currentRent} onChange={e => setCurrentRent(e.target.value)} placeholder="e.g. 250" />
              </div>
              <div>
                <label style={labelStyle}>Property value (£) — for % checks</label>
                <input style={inputStyle} type="number" value={propertyValue} onChange={e => setPropertyValue(e.target.value)} placeholder="e.g. 300000" />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Escalation type *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10 }}>
                {([
                  { value: 'doubling', label: '🚨 Doubling', sub: 'Most toxic' },
                  { value: 'rpi',      label: '📈 RPI-linked', sub: 'Risky' },
                  { value: 'stepped',  label: '📊 Fixed steps', sub: 'Moderate' },
                  { value: 'fixed',    label: '✓ Fixed forever', sub: 'Best' },
                ] as const).map(opt => (
                  <button
                    key={opt.value} type="button"
                    onClick={() => setEscalationType(opt.value)}
                    style={{
                      padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      background: escalationType === opt.value ? 'var(--brand-50)' : '#fff',
                      border: `1.5px solid ${escalationType === opt.value ? 'var(--brand-400)' : 'var(--slate-200)'}`,
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-900)', margin: '0 0 2px' }}>{opt.label}</p>
                    <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: 0 }}>{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional fields */}
            {escalationType === 'doubling' && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Doubles every (years)</label>
                <input style={{ ...inputStyle, maxWidth: 160 }} type="number" min={1} value={doubleEvery} onChange={e => setDoubleEvery(e.target.value)} />
              </div>
            )}
            {escalationType === 'rpi' && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Assumed average RPI (%)</label>
                <input style={{ ...inputStyle, maxWidth: 160 }} type="number" step="0.1" value={avgRPI} onChange={e => setAvgRPI(e.target.value)} placeholder="3.0" />
              </div>
            )}
            {escalationType === 'stepped' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Increase amount (£)</label>
                  <input style={inputStyle} type="number" value={stepAmount} onChange={e => setStepAmount(e.target.value)} placeholder="e.g. 50" />
                </div>
                <div>
                  <label style={labelStyle}>Every (years)</label>
                  <input style={inputStyle} type="number" value={stepEvery} onChange={e => setStepEvery(e.target.value)} placeholder="e.g. 5" />
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', height: 48, fontSize: 15 }}>
              Analyse ground rent risk
            </button>
          </form>
        </div>

        {/* Results */}
        {result && (() => {
          const vc = verdictColors[result.verdict]
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Verdict */}
              <div style={{ background: vc.bg, border: `1px solid ${vc.border}`, borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>
                    {result.verdict === 'fail' ? '🚨' : result.verdict === 'warning' ? '⚠️' : '✓'}
                  </span>
                  <p style={{ fontSize: 16, fontWeight: 600, color: vc.text, margin: 0 }}>{result.verdictLabel}</p>
                </div>
                <p style={{ fontSize: 14, color: vc.text, margin: 0, lineHeight: 1.6, opacity: 0.85 }}>{result.verdictDetail}</p>
              </div>

              {/* Projection table */}
              <div className="card" style={{ padding: 24, overflowX: 'auto' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                  Ground rent projections
                </p>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--slate-200)' }}>
                      {['Year', 'Annual rent', '% of value', 'Lender risk'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 12px 10px', fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.projections.filter(r => [1, 5, 10, 20, 30, 40].includes(r.year)).map(row => (
                      <tr key={row.year} style={{ borderBottom: '1px solid var(--slate-100)', background: row.lenderFlag ? '#fef2f2' : 'transparent' }}>
                        <td style={{ padding: '9px 12px', color: 'var(--slate-600)' }}>Year {row.year}</td>
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: row.lenderFlag ? '#dc2626' : 'var(--slate-900)' }}>{fmtGBP(row.rent)}/yr</td>
                        <td style={{ padding: '9px 12px', color: row.asPercentValue && row.asPercentValue > 0.1 ? '#dc2626' : 'var(--slate-600)' }}>
                          {row.asPercentValue !== null ? `${row.asPercentValue.toFixed(3)}%` : '—'}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          {row.lenderFlag
                            ? <span style={{ fontSize: 11, fontWeight: 600, background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 20 }}>Risk</span>
                            : <span style={{ fontSize: 11, color: '#16a34a' }}>✓ OK</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!parseFloat(propertyValue) && (
                  <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '10px 0 0' }}>* Enter property value above to see % of value column</p>
                )}
              </div>

              {/* Actions */}
              {result.verdict !== 'pass' && (
                <div style={{ background: 'var(--slate-900)', borderRadius: 14, padding: '20px 24px' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 12 }}>What to do</p>
                  {result.verdict === 'fail' ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        'Negotiate a deed of variation before exchange — convert ground rent to peppercorn (£0)',
                        'Discount the purchase price to reflect the cost of a future lease extension',
                        'Instruct a specialist leasehold solicitor — not a generalist conveyancer',
                        'Walk away if the seller refuses to vary the lease — this is a legitimate reason not to proceed',
                      ].map((a, i) => (
                        <li key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                          <span style={{ color: 'var(--brand-400)', flexShrink: 0 }}>{i + 1}.</span>{a}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                      Confirm with your mortgage lender that the escalation type is acceptable before exchange. Ask your solicitor to review the exact wording of the ground rent clause in the lease.
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })()}

      </main>
      <Footer />
    </div>
  )
}
