'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { HomebuyerReport, CheckResult, CheckStatus, Verdict } from '../lib/homebuyerCheck'

// ─── Design tokens ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<CheckStatus, { bg: string; border: string; dot: string; label: string }> = {
  pass:    { bg: '#f0fdf4', border: '#86efac', dot: '#16a34a', label: 'Pass'    },
  warning: { bg: '#fffbeb', border: '#fcd34d', dot: '#d97706', label: 'Warning' },
  fail:    { bg: '#fff1f2', border: '#fda4af', dot: '#e11d48', label: 'Risk'    },
  info:    { bg: '#f0f9ff', border: '#7dd3fc', dot: '#0284c7', label: 'Info'    },
}

const VERDICT_STYLES: Record<Verdict, { bg: string; border: string; title: string; body: string; badge: string; badgeText: string }> = {
  good:    { bg: '#f0fdf4', border: '#86efac', title: '#14532d', body: '#166534', badge: '#dcfce7', badgeText: '#14532d' },
  caution: { bg: '#fffbeb', border: '#fcd34d', title: '#451a03', body: '#92400e', badge: '#fef3c7', badgeText: '#451a03' },
  risk:    { bg: '#fff1f2', border: '#fda4af', title: '#4c0519', body: '#9f1239', badge: '#ffe4e6', badgeText: '#4c0519' },
}

const VERDICT_EMOJI: Record<Verdict, string> = {
  good: '✓', caution: '⚠', risk: '✕',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '18px 40px', borderBottom: '1px solid #e2ddd6',
      background: 'rgba(248,247,244,0.95)', backdropFilter: 'blur(12px)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <Link href="/" style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: '#1a1917', textDecoration: 'none' }}>
        Prop<span style={{ color: '#1D9E75' }}>Pilot</span>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 13, color: '#5e5a52', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 20, padding: '4px 12px' }}>
          Homebuyer Check
        </span>
        <Link href="/tools" style={{ fontSize: 13, color: '#5e5a52', textDecoration: 'none' }}>Tools</Link>
        <Link href="/" style={{ fontSize: 13, color: '#5e5a52', textDecoration: 'none' }}>← Home</Link>
      </div>
    </nav>
  )
}

function SearchForm({ onSubmit, loading }: {
  onSubmit: (data: { postcode: string; address: string; houseNumber: string; street: string; askingPrice: string }) => void
  loading: boolean
}) {
  const [postcode,     setPostcode]     = useState('')
  const [houseNumber,  setHouseNumber]  = useState('')
  const [street,       setStreet]       = useState('')
  const [askingPrice,  setAskingPrice]  = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const address = `${houseNumber} ${street}`.trim()
    onSubmit({ postcode, address, houseNumber, street, askingPrice })
  }

  const inputStyle = {
    width: '100%', height: 44, padding: '0 14px', fontSize: 14,
    border: '1.5px solid #e2ddd6', borderRadius: 10,
    background: '#fff', color: '#1a1917', fontFamily: 'var(--font-body)',
    outline: 'none', transition: 'border-color 0.15s',
  }
  const labelStyle = { fontSize: 12, fontWeight: 500, color: '#5e5a52', display: 'block', marginBottom: 6 } as const

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '56px 40px 0' }}>
      <div style={{ marginBottom: 40 }}>
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9e998f', display: 'block', marginBottom: 10 }}>
          Free property due diligence
        </span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 500, color: '#1a1917', lineHeight: 1.2, marginBottom: 14 }}>
          Is this property hiding any nasty surprises?
        </h1>
        <p style={{ fontSize: 16, color: '#5e5a52', lineHeight: 1.7, maxWidth: 520, margin: 0 }}>
          Enter the property details and we'll run 8 automated checks — EPC rating, maintenance costs, flood risk, price history and more — so you know the true cost of ownership before you make an offer.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 16, padding: '28px', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>House number or name</label>
              <input
                value={houseNumber} onChange={e => setHouseNumber(e.target.value)}
                placeholder="e.g. 42" required style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Street</label>
              <input
                value={street} onChange={e => setStreet(e.target.value)}
                placeholder="e.g. Peckham Road" required style={inputStyle}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Postcode</label>
              <input
                value={postcode} onChange={e => setPostcode(e.target.value.toUpperCase())}
                placeholder="e.g. SE15 4NX" required style={inputStyle}
                maxLength={8}
              />
            </div>
            <div>
              <label style={labelStyle}>Asking price (optional)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9e998f' }}>£</span>
                <input
                  type="number" value={askingPrice} onChange={e => setAskingPrice(e.target.value)}
                  placeholder="425000" style={{ ...inputStyle, paddingLeft: 28 }}
                  min={0}
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit" disabled={loading}
          style={{
            width: '100%', height: 52, fontSize: 15, fontWeight: 500,
            background: loading ? '#9fe1cb' : '#1D9E75', color: '#fff',
            border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)', transition: 'background 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          {loading ? (
            <>
              <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              Running checks…
            </>
          ) : (
            'Run property checks →'
          )}
        </button>
        <p style={{ fontSize: 12, color: '#9e998f', textAlign: 'center', marginTop: 10 }}>
          Free · Uses Land Registry and EPC Register public data · Takes ~5 seconds
        </p>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function CostBar({ low, high, label }: { low: number; high: number; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
      <span style={{ fontSize: 12, color: '#5e5a52', minWidth: 120, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: '#f0ede8', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, (high / 40000) * 100)}%`, background: high > 20000 ? '#e11d48' : high > 8000 ? '#d97706' : '#16a34a', borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1917', minWidth: 130, textAlign: 'right' }}>
        {low > 0 ? `£${low.toLocaleString()}–£${high.toLocaleString()}` : 'No cost'}
      </span>
    </div>
  )
}

function CheckCard({ check }: { check: CheckResult }) {
  const [expanded, setExpanded] = useState(false)
  const s = STATUS_STYLES[check.status]

  return (
    <div style={{
      background: '#fff', border: `1px solid #e2ddd6`,
      borderLeft: `3px solid ${s.dot}`,
      borderRadius: 12, overflow: 'hidden',
      transition: 'box-shadow 0.15s',
    }}>
      <button
        onClick={() => setExpanded(x => !x)}
        style={{
          width: '100%', padding: '14px 16px', display: 'flex',
          alignItems: 'center', gap: 12, background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{
          width: 22, height: 22, borderRadius: '50%', background: s.bg,
          border: `1.5px solid ${s.border}`, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: s.dot,
        }}>
          {check.status === 'pass' ? '✓' : check.status === 'fail' ? '✕' : check.status === 'warning' ? '!' : 'i'}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1917', margin: '0 0 2px' }}>{check.title}</p>
          <p style={{ fontSize: 12, color: '#5e5a52', margin: 0 }}>{check.summary}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {check.estimatedCostHigh > 0 && (
            <span style={{ fontSize: 12, fontWeight: 500, color: check.estimatedCostHigh > 10000 ? '#e11d48' : '#d97706', background: check.estimatedCostHigh > 10000 ? '#fff1f2' : '#fffbeb', padding: '2px 8px', borderRadius: 20 }}>
              £{check.estimatedCostLow.toLocaleString()}–£{check.estimatedCostHigh.toLocaleString()}
            </span>
          )}
          <span style={{ fontSize: 16, color: '#9e998f', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>↓</span>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f0ede8' }}>
          <p style={{ fontSize: 13, color: '#5e5a52', lineHeight: 1.7, margin: '12px 0 10px' }}>{check.detail}</p>
          {check.actionRequired && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#451a03', margin: '0 0 2px' }}>Action required</p>
              <p style={{ fontSize: 12, color: '#92400e', margin: 0, lineHeight: 1.6 }}>{check.actionRequired}</p>
            </div>
          )}
          {check.grants.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {check.grants.map((g, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 500, background: '#f0fdf4', color: '#14532d', border: '1px solid #86efac', borderRadius: 20, padding: '2px 10px' }}>
                  Grant: {g}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ReportView({ report }: { report: HomebuyerReport }) {
  const vs = VERDICT_STYLES[report.verdict]

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 40px 80px' }}>

      {/* Verdict banner */}
      <div style={{ background: vs.bg, border: `1.5px solid ${vs.border}`, borderRadius: 16, padding: '24px 28px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: vs.badge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: vs.badgeText, flexShrink: 0 }}>
            {VERDICT_EMOJI[report.verdict]}
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: vs.title, margin: '0 0 8px', lineHeight: 1.3 }}>{report.verdictTitle}</p>
            <p style={{ fontSize: 14, color: vs.body, margin: 0, lineHeight: 1.7 }}>{report.verdictBody}</p>
          </div>
        </div>
      </div>

      {/* Address + meta */}
      <div style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1917', margin: 0 }}>{report.address}</p>
          <p style={{ fontSize: 12, color: '#9e998f', margin: 0 }}>{report.postcode}</p>
        </div>
        <span style={{ fontSize: 11, color: '#9e998f' }}>
          Report generated {new Date(report.generatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
      </div>

      {/* Cost summary */}
      {report.totalCostHigh > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 12, padding: '20px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9e998f', margin: 0 }}>Estimated 5-year costs</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500, color: '#1a1917', margin: 0 }}>
              £{report.totalCostLow.toLocaleString()}–£{report.totalCostHigh.toLocaleString()}
            </p>
          </div>
          <div style={{ borderTop: '1px solid #f0ede8', paddingTop: 14 }}>
            {report.checks
              .filter(c => c.estimatedCostHigh > 0)
              .map(c => (
                <CostBar key={c.id} label={c.title.split('—')[0].trim()} low={c.estimatedCostLow} high={c.estimatedCostHigh} />
              ))}
          </div>
        </div>
      )}

      {/* All checks */}
      <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9e998f', margin: '0 0 12px' }}>
        {report.checks.length} automated checks
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        {report.checks.map(check => (
          <CheckCard key={check.id} check={check} />
        ))}
      </div>

      {/* Negotiation points */}
      {report.negotiationPoints.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 12, padding: '20px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9e998f', margin: '0 0 14px' }}>
            Negotiation points
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {report.negotiationPoints.map((point, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fef3c7', color: '#451a03', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                <p style={{ fontSize: 13, color: '#1a1917', margin: 0, lineHeight: 1.6 }}>{point}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Must-dos before exchange */}
      {report.mustDoBeforeExchange.length > 0 && (
        <div style={{ background: '#fff1f2', border: '1px solid #fda4af', borderRadius: 12, padding: '20px', marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9f1239', margin: '0 0 14px' }}>
            Do these before you exchange
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {report.mustDoBeforeExchange.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e11d48', flexShrink: 0, marginTop: 6 }} />
                <p style={{ fontSize: 13, color: '#4c0519', margin: 0, lineHeight: 1.6 }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{ background: '#f8f7f4', border: '1px solid #e2ddd6', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1917', margin: '0 0 6px' }}>Once you buy — track it with PropPilot</p>
        <p style={{ fontSize: 13, color: '#5e5a52', margin: '0 0 16px', lineHeight: 1.6 }}>Get ongoing maintenance alerts, EPC upgrade planning, and remortgage radar — all in one place.</p>
        <Link href="/#waitlist" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#1D9E75', color: '#fff', textDecoration: 'none',
          fontSize: 14, fontWeight: 500, padding: '10px 24px', borderRadius: 10,
        }}>
          Join the waitlist → free
        </Link>
      </div>

    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{ maxWidth: 680, margin: '32px auto', padding: '0 40px' }}>
      <div style={{ background: '#fff1f2', border: '1px solid #fda4af', borderRadius: 12, padding: '16px 20px' }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: '#9f1239', margin: '0 0 4px' }}>Something went wrong</p>
        <p style={{ fontSize: 13, color: '#4c0519', margin: 0, lineHeight: 1.6 }}>{message}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomebuyerCheckPage() {
  const [loading,  setLoading]  = useState(false)
  const [report,   setReport]   = useState<HomebuyerReport | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  const handleSubmit = async (data: {
    postcode: string
    address: string
    houseNumber: string
    street: string
    askingPrice: string
  }) => {
    setLoading(true)
    setError(null)
    setReport(null)

    try {
      const res = await fetch('/api/homebuyer/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postcode:    data.postcode,
          address:     data.address,
          houseNumber: data.houseNumber,
          street:      data.street,
          askingPrice: data.askingPrice ? parseFloat(data.askingPrice) : undefined,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Check failed. Please try again.')
        return
      }

      setReport(json.report)

    } catch {
      setError('Network error — please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4' }}>
      <Nav />
      {!report && <SearchForm onSubmit={handleSubmit} loading={loading} />}
      {error && <ErrorBanner message={error} />}
      {report && (
        <>
          <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 40px 0' }}>
            <button
              onClick={() => { setReport(null); setError(null) }}
              style={{ fontSize: 13, color: '#5e5a52', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              ← Check another property
            </button>
          </div>
          <ReportView report={report} />
        </>
      )}
    </div>
  )
}
