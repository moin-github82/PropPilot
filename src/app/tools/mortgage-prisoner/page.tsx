'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SiteNav } from '../../components/SiteNav'
import { Footer } from '../../components/Footer'

function fmtGBP(n: number): string {
  return '£' + Math.round(n).toLocaleString('en-GB')
}

export default function MortgagePrisonerPage() {
  const [mortgageBalance,   setMortgageBalance]   = useState('')
  const [currentRate,       setCurrentRate]        = useState('')
  const [propertyValue,     setPropertyValue]      = useState('')
  const [fixEndDate,        setFixEndDate]          = useState('')
  const [monthlyPayment,    setMonthlyPayment]      = useState('')
  const [result,            setResult]             = useState<null | ReturnType<typeof analyse>>(null)

  const BEST_5YR_FIX = 4.1    // approximate best market rate 2025
  const BEST_2YR_FIX = 4.4
  const TYPICAL_SVR  = 7.2

  function analyse(
    balance: number,
    rate: number,
    value: number | null,
    fixEnd: string | null,
    monthly: number | null,
  ) {
    const ltv = value ? Math.round((balance / value) * 100) : null
    const ltvBand = ltv
      ? ltv <= 60 ? '≤60%' : ltv <= 75 ? '61–75%' : ltv <= 85 ? '76–85%' : ltv <= 90 ? '86–90%' : '>90%'
      : null

    const daysToFix = fixEnd
      ? Math.ceil((new Date(fixEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null
    const isExpired  = daysToFix !== null && daysToFix < 0
    const onSVR      = isExpired || (!fixEnd && rate > 6.5)

    // Monthly payment on SVR vs best fix (simplified — no amortisation)
    const monthlyAtSVR   = (balance * (TYPICAL_SVR   / 100)) / 12
    const monthlyAt5yr   = (balance * (BEST_5YR_FIX  / 100)) / 12
    const monthlyAt2yr   = (balance * (BEST_2YR_FIX  / 100)) / 12
    const monthlyAtCurrent = monthly ?? (balance * (rate / 100)) / 12

    const savingVsSVR5yr  = Math.max(0, monthlyAtSVR  - monthlyAt5yr)
    const savingCurrent5yr = Math.max(0, monthlyAtCurrent - monthlyAt5yr)

    // LTV-based deal availability
    const dealsAvailable: { ltv: string; rate: string; available: boolean; note: string }[] = [
      { ltv: '≤60%',  rate: '~3.8–4.1%', available: !ltv || ltv <= 60,  note: 'Best rates' },
      { ltv: '≤75%',  rate: '~4.1–4.4%', available: !ltv || ltv <= 75,  note: 'Good deals' },
      { ltv: '≤85%',  rate: '~4.4–4.9%', available: !ltv || ltv <= 85,  note: 'Standard deals' },
      { ltv: '≤90%',  rate: '~5.0–5.5%', available: !ltv || ltv <= 90,  note: 'Higher rates' },
      { ltv: '>90%',  rate: '~5.5–7%+',  available: true,                note: 'Very limited deals' },
    ]

    // Imprisonment signals
    const prisonerSignals: string[] = []
    if (onSVR || (rate > TYPICAL_SVR - 0.5)) prisonerSignals.push('You appear to be on or near SVR')
    if (ltv && ltv > 90) prisonerSignals.push('LTV above 90% — severely limited deal choice')
    if (ltv && ltv > 100) prisonerSignals.push('Negative equity — standard remortgage products unavailable')
    if (savingCurrent5yr > 200) prisonerSignals.push(`You could save ~${fmtGBP(savingCurrent5yr * 12)}/year by switching`)

    const isPrisoner = prisonerSignals.length >= 2 || (ltv && ltv > 100) || onSVR

    return {
      balance,
      rate,
      ltv,
      ltvBand,
      fixEnd,
      daysToFix,
      isExpired,
      onSVR,
      monthlyAtSVR,
      monthlyAt5yr,
      monthlyAt2yr,
      monthlyAtCurrent,
      savingVsSVR5yr,
      savingCurrent5yr,
      dealsAvailable,
      prisonerSignals,
      isPrisoner,
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const balance = parseFloat(mortgageBalance)
    const rate    = parseFloat(currentRate)
    if (!balance || !rate) return
    setResult(analyse(
      balance,
      rate,
      parseFloat(propertyValue) || null,
      fixEndDate || null,
      parseFloat(monthlyPayment) || null,
    ))
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
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7c3aed', display: 'block', marginBottom: 10 }}>
            Mortgage
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,4vw,40px)', fontWeight: 500, color: 'var(--slate-900)', marginBottom: 12 }}>
            Am I a Mortgage Prisoner?
          </h1>
          <p style={{ fontSize: 16, color: 'var(--slate-500)', lineHeight: 1.7, maxWidth: 560, margin: 0 }}>
            An estimated 200,000 UK homeowners are paying their lender&apos;s Standard Variable Rate (SVR) when better deals exist — because high LTV, affordability stress tests, or expired offers have trapped them. Find out if you&apos;re one of them.
          </p>
        </div>

        {/* Explainer */}
        <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: '14px 18px', marginBottom: 28 }}>
          <p style={{ fontSize: 13, color: '#4c1d95', margin: 0 }}>
            <strong>SVR in 2025 averages ~7.2%.</strong> The best 5-year fixed rates are ~4.1%. On a £200,000 mortgage, that&apos;s a difference of roughly £517/month — or £6,200/year.
          </p>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: 28, marginBottom: 28 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Outstanding mortgage balance (£) *</label>
                <input style={inputStyle} type="number" required value={mortgageBalance} onChange={e => setMortgageBalance(e.target.value)} placeholder="e.g. 180000" />
              </div>
              <div>
                <label style={labelStyle}>Current interest rate (%) *</label>
                <input style={inputStyle} type="number" required step="0.01" value={currentRate} onChange={e => setCurrentRate(e.target.value)} placeholder="e.g. 7.2" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Property value (£)</label>
                <input style={inputStyle} type="number" value={propertyValue} onChange={e => setPropertyValue(e.target.value)} placeholder="e.g. 260000" />
              </div>
              <div>
                <label style={labelStyle}>Fix end date (if fixed rate)</label>
                <input style={inputStyle} type="date" value={fixEndDate} onChange={e => setFixEndDate(e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Current monthly payment (£) — optional</label>
              <input style={{ ...inputStyle, maxWidth: 220 }} type="number" value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)} placeholder="e.g. 1100" />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', height: 48, fontSize: 15 }}>
              Check my position
            </button>
          </form>
        </div>

        {/* Results */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Verdict banner */}
            <div style={{
              borderRadius: 14, padding: '22px 26px',
              background: result.isPrisoner ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${result.isPrisoner ? '#fca5a5' : '#86efac'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 24 }}>{result.isPrisoner ? '🔒' : '✓'}</span>
                <p style={{ fontSize: 18, fontWeight: 600, color: result.isPrisoner ? '#7f1d1d' : '#14532d', margin: 0 }}>
                  {result.isPrisoner ? 'You may be a mortgage prisoner' : 'You appear to have deal options'}
                </p>
              </div>
              {result.prisonerSignals.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {result.prisonerSignals.map((s, i) => (
                    <li key={i} style={{ fontSize: 13, color: result.isPrisoner ? '#991b1b' : '#15803d', display: 'flex', gap: 8 }}>
                      <span>{result.isPrisoner ? '→' : '✓'}</span>{s}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Key numbers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 14 }}>
              {[
                { label: 'Your current rate', value: `${result.rate}%`, sub: result.onSVR ? 'You are on SVR' : result.isExpired ? 'Fix expired' : `Fix ends ${result.daysToFix} days`, highlight: result.onSVR },
                { label: 'Loan to Value',     value: result.ltv !== null ? `${result.ltv}% LTV` : '—', sub: result.ltvBand ?? 'Add property value', highlight: result.ltv !== null && result.ltv > 90 },
                { label: 'Monthly at SVR',    value: fmtGBP(result.monthlyAtSVR), sub: `at ${TYPICAL_SVR}% SVR`, highlight: false },
                { label: 'Monthly at best 5yr fix', value: fmtGBP(result.monthlyAt5yr), sub: `at ~${BEST_5YR_FIX}%`, highlight: false },
              ].map((s, i) => (
                <div key={i} style={{
                  background: s.highlight ? '#fef2f2' : '#fff',
                  border: `1px solid ${s.highlight ? '#fca5a5' : 'var(--slate-200)'}`,
                  borderRadius: 12, padding: '16px 18px',
                }}>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>{s.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 600, color: s.highlight ? '#dc2626' : 'var(--slate-900)', margin: '0 0 4px', fontFamily: 'var(--font-display)' }}>{s.value}</p>
                  <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: 0 }}>{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Potential saving */}
            {result.savingCurrent5yr > 50 && (
              <div style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-200)', borderRadius: 14, padding: '20px 24px' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-800)', margin: '0 0 4px' }}>💡 Potential saving by switching</p>
                <p style={{ fontSize: 28, fontWeight: 600, color: 'var(--brand-400)', margin: '0 0 4px', fontFamily: 'var(--font-display)' }}>
                  {fmtGBP(result.savingCurrent5yr * 12)}/year
                </p>
                <p style={{ fontSize: 13, color: 'var(--brand-600)', margin: 0 }}>
                  {fmtGBP(result.savingCurrent5yr)}/month vs best available 5-year fix at ~{BEST_5YR_FIX}%. This is indicative — use a broker for a precise quote.
                </p>
              </div>
            )}

            {/* LTV deal table */}
            {result.ltv !== null && (
              <div className="card" style={{ padding: 24 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                  Deals available at your LTV
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.dealsAvailable.map((d, i) => {
                    const isYourBand = result.ltvBand === d.ltv || (d.ltv === '>90%' && (result.ltv ?? 0) > 90)
                    return (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', borderRadius: 8,
                        background: isYourBand ? 'var(--brand-50)' : '#f8f7f4',
                        border: `1px solid ${isYourBand ? 'var(--brand-200)' : 'var(--slate-200)'}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: isYourBand ? 600 : 400, color: 'var(--slate-800)' }}>LTV {d.ltv}</span>
                          {isYourBand && <span style={{ fontSize: 11, background: 'var(--brand-400)', color: '#fff', padding: '1px 7px', borderRadius: 20 }}>You</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: 'var(--slate-600)' }}>{d.rate}</span>
                          <span style={{ fontSize: 11, color: d.available ? '#16a34a' : 'var(--slate-400)', fontWeight: 500 }}>{d.note}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* What to do */}
            <div style={{ background: 'var(--slate-900)', borderRadius: 14, padding: '20px 24px' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 14 }}>Your next steps</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { n: '1', title: 'Use a fee-free whole-of-market broker', body: 'L&C, Habito, and Trussle are fee-free (paid by lenders). They search the whole market, not just one bank\'s products. If high LTV makes standard products unavailable, they can access specialist lenders.' },
                  { n: '2', title: 'Check for the Mortgage Charter', body: 'Under the Mortgage Charter (signed by major lenders in 2023), customers can switch to a new deal 6 months before their current deal ends — without a new affordability assessment. Ask your current lender first.' },
                  { n: '3', title: 'Consider overpaying to reduce LTV', body: 'If your LTV is near a threshold (e.g. 85% → 75%), overpaying to reach the better band could unlock significantly lower rates — potentially saving more than the overpayment costs.' },
                  { n: '4', title: 'FCA Mortgage Prisoner review', body: 'If you are genuinely trapped (your lender was sold to an inactive company with no new products), the FCA introduced rule changes in 2019 to make switching easier. Contact Citizens Advice or a specialist broker.' },
                ].map(s => (
                  <div key={s.n} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--brand-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{s.n}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 2px' }}>{s.title}</p>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </main>
      <Footer />
    </div>
  )
}
