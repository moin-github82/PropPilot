'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { SiteNav } from '../../components/SiteNav'
import { Footer } from '../../components/Footer'

// ─── Help to Buy Equity Loan Calculator ──────────────────────────────────────
// The government owns an equity SHARE (20% outside London, 40% London)
// of the property's CURRENT value — not the purchase price.
// On sale or full repayment, the borrower repays that % of current value.

const LONDON_POSTCODES = ['E', 'EC', 'N', 'NW', 'SE', 'SW', 'W', 'WC', 'BR', 'CR', 'DA', 'EN', 'HA', 'IG', 'KT', 'RM', 'SM', 'TW', 'UB', 'WD']

function isLondon(postcode: string): boolean {
  const prefix = postcode.trim().toUpperCase().replace(/\s/g, '').slice(0, 2)
  return LONDON_POSTCODES.some(p => prefix.startsWith(p))
}

function fmtGBP(n: number): string {
  return '£' + Math.round(n).toLocaleString('en-GB')
}

export default function HelpToBuyPage() {
  const [postcode,       setPostcode]       = useState('')
  const [purchasePrice,  setPurchasePrice]  = useState('')
  const [currentValue,   setCurrentValue]   = useState('')
  const [equityPct,      setEquityPct]      = useState(20)
  const [yearsPurchased, setYearsPurchased] = useState('')
  const [managementFee,  setManagementFee]  = useState(1.75)  // 1.75% of equity after year 5, free years 1-5
  const [customEquity,   setCustomEquity]   = useState(false)
  const [result,         setResult]         = useState<ReturnType<typeof calculate> | null>(null)

  function calculate(
    pp: number,
    cv: number,
    eqPct: number,
    yearsBought: number,
    fee: number,
  ) {
    const equityOwed       = cv * (eqPct / 100)
    const equityAtPurchase = pp * (eqPct / 100)
    const valueGain        = cv - pp
    const equityGain       = equityOwed - equityAtPurchase

    // Management fee: free for first 5 years, then 1.75% of equity per year (rising by RPI+1%)
    // For simplicity: show current annual fee
    const feeYearsElapsed = Math.max(0, yearsBought - 5)
    const annualFee       = feeYearsElapsed > 0 ? (equityOwed * fee / 100) : 0
    const totalFeesPaid   = feeYearsElapsed > 0
      ? equityAtPurchase * (fee / 100) * feeYearsElapsed   // simplified (no compounding)
      : 0

    // If sold today: net proceeds = sale price - mortgage outstanding - equity owed
    // We can't know mortgage, but show equity repayment as % of sale proceeds
    const netAfterEquity  = cv - equityOwed

    return {
      equityOwed,
      equityAtPurchase,
      valueGain,
      equityGain,
      annualFee,
      totalFeesPaid,
      netAfterEquity,
      eqPct,
      purchasePrice: pp,
      currentValue:  cv,
    }
  }

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const pp = parseFloat(purchasePrice)
    const cv = parseFloat(currentValue) || pp
    const yb = parseInt(yearsPurchased) || 0
    if (!pp || pp <= 0) return
    const london = isLondon(postcode)
    const effectiveEqPct = customEquity ? equityPct : (london ? 40 : 20)
    setEquityPct(effectiveEqPct)
    setResult(calculate(pp, cv, effectiveEqPct, yb, managementFee))
  }, [purchasePrice, currentValue, postcode, equityPct, yearsPurchased, managementFee, customEquity])

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 44, padding: '0 14px', fontSize: 15,
    border: '1.5px solid var(--slate-200)', borderRadius: 'var(--radius-md)',
    background: '#fff', color: 'var(--slate-800)', outline: 'none',
    fontFamily: 'var(--font-body)',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 500, color: 'var(--slate-600)',
    display: 'block', marginBottom: 6,
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
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f59e0b', display: 'block', marginBottom: 10 }}>
            Help to Buy
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,4vw,40px)', fontWeight: 500, color: 'var(--slate-900)', marginBottom: 12 }}>
            Equity Loan Calculator
          </h1>
          <p style={{ fontSize: 16, color: 'var(--slate-500)', lineHeight: 1.7, maxWidth: 560, margin: 0 }}>
            The government owns a <strong>share of your home&apos;s current value</strong> — not what you paid. As your home rises in value, so does what you owe. This calculator shows your real liability today.
          </p>
        </div>

        {/* Warning banner */}
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12, padding: '14px 18px', marginBottom: 28 }}>
          <p style={{ fontSize: 13, color: '#92400e', margin: 0, fontWeight: 500 }}>
            ⚠️ Most Help to Buy homeowners don&apos;t realise: if your home rises in value, the government takes a bigger cut than it put in — in absolute terms. A £50k loan on a property worth £250k becomes £80k owed if the property reaches £400k.
          </p>
        </div>

        {/* Form */}
        <div className="card" style={{ marginBottom: 28, padding: 28 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Purchase price *</label>
                <input
                  style={inputStyle} type="number" required
                  value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)}
                  placeholder="e.g. 250000"
                />
              </div>
              <div>
                <label style={labelStyle}>Current estimated value</label>
                <input
                  style={inputStyle} type="number"
                  value={currentValue} onChange={e => setCurrentValue(e.target.value)}
                  placeholder="Leave blank to use purchase price"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Postcode (for London rate)</label>
                <input
                  style={inputStyle} type="text"
                  value={postcode} onChange={e => setPostcode(e.target.value)}
                  placeholder="e.g. SW1A 1AA"
                />
              </div>
              <div>
                <label style={labelStyle}>Years since purchase</label>
                <input
                  style={inputStyle} type="number" min={0} max={40}
                  value={yearsPurchased} onChange={e => setYearsPurchased(e.target.value)}
                  placeholder="e.g. 4"
                />
              </div>
            </div>

            {/* Custom equity % toggle */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={customEquity}
                  onChange={e => setCustomEquity(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--brand-400)' }}
                />
                <span style={{ fontSize: 13, color: 'var(--slate-600)' }}>I know my exact equity % (not standard 20% or 40%)</span>
              </label>
              {customEquity && (
                <div style={{ marginTop: 10 }}>
                  <label style={labelStyle}>Government equity share (%)</label>
                  <input
                    style={{ ...inputStyle, width: 120 }} type="number" min={1} max={40}
                    value={equityPct} onChange={e => setEquityPct(Number(e.target.value))}
                  />
                </div>
              )}
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', height: 48, fontSize: 15 }}>
              Calculate my equity liability
            </button>
          </form>
        </div>

        {/* Results */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Summary card */}
            <div style={{ background: '#04342C', borderRadius: 16, padding: '28px 32px', color: '#fff' }}>
              <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
                Your Help to Buy position today
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 20 }}>
                <div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>Equity % owned by government</p>
                  <p style={{ fontSize: 28, fontWeight: 600, color: '#5DCAA5', margin: 0 }}>{result.eqPct}%</p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>You owe today</p>
                  <p style={{ fontSize: 28, fontWeight: 600, color: '#fbbf24', margin: 0 }}>{fmtGBP(result.equityOwed)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>Original loan amount</p>
                  <p style={{ fontSize: 22, fontWeight: 500, color: '#fff', margin: 0 }}>{fmtGBP(result.equityAtPurchase)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>Loan growth</p>
                  <p style={{ fontSize: 22, fontWeight: 500, color: result.equityGain > 0 ? '#f87171' : '#5DCAA5', margin: 0 }}>
                    {result.equityGain >= 0 ? '+' : ''}{fmtGBP(result.equityGain)}
                  </p>
                </div>
              </div>
            </div>

            {/* Detail breakdown */}
            <div className="card" style={{ padding: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Breakdown</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Purchase price', value: fmtGBP(result.purchasePrice), sub: '' },
                  { label: 'Current estimated value', value: fmtGBP(result.currentValue), sub: result.valueGain > 0 ? `+${fmtGBP(result.valueGain)} (${Math.round((result.valueGain / result.purchasePrice) * 100)}%)` : '' },
                  { label: `Government equity (${result.eqPct}% of current value)`, value: fmtGBP(result.equityOwed), sub: `Was ${fmtGBP(result.equityAtPurchase)} at purchase`, highlight: true },
                  { label: 'Your net equity (after equity loan)', value: fmtGBP(result.netAfterEquity), sub: 'Before mortgage balance' },
                  { label: 'Annual management fee (year 6+)', value: result.annualFee > 0 ? `${fmtGBP(result.annualFee)}/year` : 'Free (years 1–5)', sub: result.annualFee > 0 ? `${managementFee}% of equity owed, rising by RPI+1% annually` : '' },
                  { label: 'Approx. fees paid to date', value: result.totalFeesPaid > 0 ? fmtGBP(result.totalFeesPaid) : '£0', sub: 'Simplified estimate' },
                ].map((row, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    padding: '10px 14px', borderRadius: 8,
                    background: row.highlight ? '#fffbeb' : i % 2 === 0 ? '#f8f7f4' : '#fff',
                    border: row.highlight ? '1px solid #fcd34d' : '1px solid transparent',
                  }}>
                    <div>
                      <p style={{ fontSize: 14, color: 'var(--slate-700)', margin: 0, fontWeight: row.highlight ? 600 : 400 }}>{row.label}</p>
                      {row.sub && <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '2px 0 0' }}>{row.sub}</p>}
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: row.highlight ? '#92400e' : 'var(--slate-900)', margin: 0, flexShrink: 0, paddingLeft: 16 }}>{row.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Future projections */}
            <div className="card" style={{ padding: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                What you&apos;ll owe if the property grows at 3% per year
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10 }}>
                {[5, 10, 15, 20].map(years => {
                  const projectedValue  = result.currentValue * Math.pow(1.03, years)
                  const projectedEquity = projectedValue * (result.eqPct / 100)
                  return (
                    <div key={years} style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-200)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                      <p style={{ fontSize: 12, color: 'var(--brand-600)', margin: '0 0 6px' }}>In {years} years</p>
                      <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--brand-800)', margin: '0 0 4px' }}>{fmtGBP(projectedEquity)}</p>
                      <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: 0 }}>home ~{fmtGBP(projectedValue)}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* What to do */}
            <div style={{ background: 'var(--slate-900)', borderRadius: 14, padding: '22px 26px' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 14 }}>Your options</p>
              {[
                { n: '1', title: 'Staircase (partial repayment)', body: 'Pay off part of the equity loan (minimum 10% of property value) to reduce the government\'s share. Must be done via a RICS valuation. Each staircasing costs £1,000–£3,000 in fees.' },
                { n: '2', title: 'Full repayment', body: 'Repay the full equity loan at any time — triggered automatically on sale. The repayment is always the government\'s % of current value, not the original loan amount.' },
                { n: '3', title: 'Remortgage (keep equity loan)', body: 'You can remortgage your mortgage element without repaying the equity loan. However, your mortgage lender must agree to subordination of the government\'s charge.' },
              ].map(opt => (
                <div key={opt.n} style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--brand-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{opt.n}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 2px' }}>{opt.title}</p>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{opt.body}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </main>
      <Footer />
    </div>
  )
}
