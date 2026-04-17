'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUser, getProperty, saveProperty, logout, clearProperty } from '../lib/auth'
import type { User, StoredProperty } from '../lib/auth'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function fmtGBP(n: number): string {
  return '£' + n.toLocaleString('en-GB')
}

function daysUntil(isoDate: string): number {
  const diff = new Date(isoDate).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function epcColor(band: string | null): string {
  const colors: Record<string, string> = {
    A: '#22c55e', B: '#84cc16', C: '#a3e635',
    D: '#facc15', E: '#fb923c', F: '#f87171', G: '#ef4444',
  }
  return colors[band?.toUpperCase() ?? ''] ?? '#94a3b8'
}

/** Basic maintenance flags derived from year built only — no EPC cert needed. */
function quickMaintenanceFlags(yearBuilt: number | null): { label: string; urgency: 'urgent' | 'soon' | 'plan' }[] {
  if (!yearBuilt) return []
  const age  = new Date().getFullYear() - yearBuilt
  const items: { label: string; urgency: 'urgent' | 'soon' | 'plan' }[] = []
  if (age > 25)  items.push({ label: 'Boiler replacement',       urgency: age > 35 ? 'urgent' : 'soon' })
  if (age > 30)  items.push({ label: 'Roof inspection',          urgency: age > 50 ? 'soon' : 'plan' })
  if (yearBuilt < 1970) items.push({ label: 'Electrical check (EICR)',  urgency: 'soon' })
  if (yearBuilt < 1920) items.push({ label: 'Damp survey',              urgency: 'soon' })
  if (age > 40)  items.push({ label: 'Window seals / glazing',   urgency: 'plan' })
  return items.slice(0, 4)
}

const URGENCY_COLOR: Record<string, string> = {
  urgent: '#ef4444',
  soon:   '#f59e0b',
  plan:   'var(--brand-400)',
}

// ─── Setup wizard ─────────────────────────────────────────────────────────────

const SAMPLE_PROPERTY: Omit<StoredProperty, 'addedAt'> = {
  postcode:       'MK9 3AG',
  houseNumber:    '14',
  street:         'Alderton Close',
  address:        '14 Alderton Close, Milton Keynes, MK9 3AG',
  tenure:         'Freehold',
  purchasePrice:  285000,
  purchaseDate:   '2021-06-12',
  yearBuilt:      1989,
  epcBand:        'D',
  epcScore:       59,
  estimatedValue: 312000,
  mortgageFixEnd: '2026-11-01',
  mortgageRate:   3.84,
}

function SetupWizard({ onSave }: { onSave: (p: StoredProperty) => void }) {
  const [form, setForm] = useState({
    postcode:       '',
    houseNumber:    '',
    street:         '',
    tenure:         'Freehold' as 'Freehold' | 'Leasehold',
    purchasePrice:  '',
    purchaseDate:   '',
    yearBuilt:      '',
    epcBand:        '',
    estimatedValue: '',
    mortgageFixEnd: '',
    mortgageRate:   '',
  })
  const [loading, setLoading] = useState(false)
  const [epcStatus, setEpcStatus] = useState<string | null>(null)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const loadSample = () => {
    setForm({
      postcode:       SAMPLE_PROPERTY.postcode,
      houseNumber:    SAMPLE_PROPERTY.houseNumber,
      street:         SAMPLE_PROPERTY.street,
      tenure:         SAMPLE_PROPERTY.tenure,
      purchasePrice:  String(SAMPLE_PROPERTY.purchasePrice ?? ''),
      purchaseDate:   SAMPLE_PROPERTY.purchaseDate ?? '',
      yearBuilt:      String(SAMPLE_PROPERTY.yearBuilt ?? ''),
      epcBand:        SAMPLE_PROPERTY.epcBand ?? '',
      estimatedValue: String(SAMPLE_PROPERTY.estimatedValue ?? ''),
      mortgageFixEnd: SAMPLE_PROPERTY.mortgageFixEnd ?? '',
      mortgageRate:   String(SAMPLE_PROPERTY.mortgageRate ?? ''),
    })
  }

  /** Try to look up EPC band from the API when postcode + address are filled in */
  const fetchEPC = async () => {
    if (!form.postcode || !form.houseNumber || !form.street) return
    setLoading(true)
    setEpcStatus('Looking up EPC certificate…')
    try {
      const address  = `${form.houseNumber} ${form.street}`
      const postcode = form.postcode.replace(/\s/g, '').toUpperCase()
      const res  = await fetch(`/api/epc/${encodeURIComponent(postcode)}?address=${encodeURIComponent(address)}`)
      const data = await res.json()
      if (data.found && data.certificate) {
        const cert = data.certificate
        setForm(f => ({
          ...f,
          epcBand:   cert.currentBand ?? f.epcBand,
          yearBuilt: cert.builtForm ? f.yearBuilt : f.yearBuilt,  // keep user value
        }))
        setEpcStatus(`EPC found — Band ${cert.currentBand} (score ${cert.currentScore}/100)`)
      } else {
        setEpcStatus('No EPC found for this address — fill in manually if known')
      }
    } catch {
      setEpcStatus('Could not fetch EPC — fill in manually')
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const p: StoredProperty = {
      postcode:       form.postcode.toUpperCase(),
      houseNumber:    form.houseNumber,
      street:         form.street,
      address:        `${form.houseNumber} ${form.street}, ${form.postcode.toUpperCase()}`,
      tenure:         form.tenure,
      purchasePrice:  form.purchasePrice  ? Number(form.purchasePrice)  : null,
      purchaseDate:   form.purchaseDate   || null,
      yearBuilt:      form.yearBuilt      ? Number(form.yearBuilt)      : null,
      epcBand:        form.epcBand.toUpperCase() || null,
      epcScore:       null,
      estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : null,
      mortgageFixEnd: form.mortgageFixEnd || null,
      mortgageRate:   form.mortgageRate   ? Number(form.mortgageRate)   : null,
      addedAt:        new Date().toISOString(),
    }
    saveProperty(p)
    onSave(p)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 42, padding: '0 12px', fontSize: 14,
    border: '1.5px solid var(--slate-200)', borderRadius: 'var(--radius-md)',
    background: '#fff', color: 'var(--slate-800)', outline: 'none',
    fontFamily: 'var(--font-body)',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 500, color: 'var(--slate-600)',
    display: 'block', marginBottom: 5,
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <span className="tag tag-green" style={{ marginBottom: 12, display: 'inline-block' }}>Setup</span>
        <h2 style={{ fontSize: 26, fontWeight: 500, color: 'var(--slate-900)', marginBottom: 10 }}>
          Add your property
        </h2>
        <p style={{ fontSize: 14, color: 'var(--slate-500)', maxWidth: 400, margin: '0 auto' }}>
          We&apos;ll use this to personalise your dashboard and keep track of everything in one place.
        </p>
      </div>

      {/* Load sample button */}
      <div
        onClick={loadSample}
        style={{
          background: 'var(--brand-50)', border: '1px dashed var(--brand-200)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 24,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        <span style={{ fontSize: 18 }}>🏠</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--brand-800)', margin: 0 }}>
            Load sample property
          </p>
          <p style={{ fontSize: 12, color: 'var(--brand-600)', margin: 0 }}>
            Use 14 Alderton Close, Milton Keynes — to demo the full dashboard
          </p>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--brand-400)' }}>Click →</span>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: 28 }}>
        {/* Address */}
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-500)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>Property address</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>House / flat no.</label>
            <input style={inputStyle} required value={form.houseNumber} onChange={e => set('houseNumber', e.target.value)} placeholder="14" />
          </div>
          <div>
            <label style={labelStyle}>Street name</label>
            <input style={inputStyle} required value={form.street} onChange={e => set('street', e.target.value)} placeholder="Alderton Close" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
          <div>
            <label style={labelStyle}>Postcode</label>
            <input style={inputStyle} required value={form.postcode} onChange={e => set('postcode', e.target.value)} placeholder="MK9 3AG" />
          </div>
          <div>
            <label style={labelStyle}>Tenure</label>
            <select
              value={form.tenure}
              onChange={e => set('tenure', e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="Freehold">Freehold</option>
              <option value="Leasehold">Leasehold</option>
            </select>
          </div>
        </div>

        {/* EPC lookup */}
        <button
          type="button" onClick={fetchEPC} disabled={loading}
          style={{
            fontSize: 13, color: 'var(--brand-600)', background: 'var(--brand-50)',
            border: '1px solid var(--brand-200)', borderRadius: 'var(--radius-md)',
            padding: '7px 14px', cursor: 'pointer', marginBottom: 4,
          }}
        >
          {loading ? 'Fetching EPC…' : '🔍 Look up EPC certificate'}
        </button>
        {epcStatus && (
          <p style={{ fontSize: 12, color: epcStatus.includes('found —') ? 'var(--brand-600)' : 'var(--slate-500)', margin: '4px 0 12px' }}>
            {epcStatus}
          </p>
        )}

        <div style={{ height: 1, background: 'var(--slate-100)', margin: '20px 0' }} />

        {/* Property details */}
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-500)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>Property details</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Year built</label>
            <input style={inputStyle} type="number" value={form.yearBuilt} onChange={e => set('yearBuilt', e.target.value)} placeholder="1989" min="1600" max="2025" />
          </div>
          <div>
            <label style={labelStyle}>EPC band</label>
            <select value={form.epcBand} onChange={e => set('epcBand', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Unknown</option>
              {['A','B','C','D','E','F','G'].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Est. current value</label>
            <input style={inputStyle} type="number" value={form.estimatedValue} onChange={e => set('estimatedValue', e.target.value)} placeholder="312000" />
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--slate-100)', margin: '20px 0' }} />

        {/* Purchase & mortgage */}
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-500)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>Purchase & mortgage</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Purchase price</label>
            <input style={inputStyle} type="number" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} placeholder="285000" />
          </div>
          <div>
            <label style={labelStyle}>Purchase date</label>
            <input style={inputStyle} type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Mortgage fix end date</label>
            <input style={inputStyle} type="date" value={form.mortgageFixEnd} onChange={e => set('mortgageFixEnd', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Current rate (%)</label>
            <input style={inputStyle} type="number" step="0.01" value={form.mortgageRate} onChange={e => set('mortgageRate', e.target.value)} placeholder="3.84" />
          </div>
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 24 }}>
          Save property and open dashboard →
        </button>
      </form>
    </div>
  )
}

// ─── Dashboard widgets ────────────────────────────────────────────────────────

function StatChip({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p style={{ fontSize: 11, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--slate-900)', margin: 0, fontFamily: 'var(--font-display)' }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '2px 0 0' }}>{sub}</p>}
    </div>
  )
}

function PropertyCard({ property, onEdit }: { property: StoredProperty; onEdit: () => void }) {
  const gain = property.estimatedValue && property.purchasePrice
    ? property.estimatedValue - property.purchasePrice
    : null

  return (
    <div className="card" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 32, alignItems: 'center' }}>
      {/* EPC badge */}
      <div style={{
        width: 72, height: 72, borderRadius: 16,
        background: epcColor(property.epcBand),
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
          {property.epcBand ?? '?'}
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.05em', marginTop: 2 }}>EPC</span>
      </div>

      {/* Address + stats */}
      <div>
        <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--slate-900)', margin: '0 0 2px' }}>{property.address}</p>
        <p style={{ fontSize: 13, color: 'var(--slate-500)', margin: '0 0 16px' }}>
          {property.tenure} · {property.yearBuilt ? `Built ${property.yearBuilt}` : 'Year built unknown'}
        </p>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {property.purchasePrice   && <StatChip label="Bought for"    value={fmtGBP(property.purchasePrice)} sub={property.purchaseDate ? new Date(property.purchaseDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : undefined} />}
          {property.estimatedValue  && <StatChip label="Est. value"    value={fmtGBP(property.estimatedValue)} sub="Land Registry indicative" />}
          {gain !== null && gain > 0 && <StatChip label="Value growth" value={`+${fmtGBP(gain)}`} sub={property.purchasePrice ? `+${Math.round((gain / property.purchasePrice) * 100)}%` : undefined} />}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
        <Link
          href={`/homebuyer?postcode=${encodeURIComponent(property.postcode)}&address=${encodeURIComponent(property.address)}`}
          className="btn-primary"
          style={{ fontSize: 13, padding: '9px 16px', whiteSpace: 'nowrap' }}
        >
          Run full check
        </Link>
        <button
          onClick={onEdit}
          className="btn-ghost"
          style={{ fontSize: 13, padding: '8px 16px', whiteSpace: 'nowrap' }}
        >
          Edit property
        </button>
      </div>
    </div>
  )
}

function RemortgageCard({ property }: { property: StoredProperty }) {
  if (!property.mortgageFixEnd) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 18 }}>🏦</span>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--slate-900)', margin: 0 }}>Remortgage radar</p>
        </div>
        <p style={{ fontSize: 13, color: 'var(--slate-500)', margin: 0 }}>
          Add your mortgage fix end date to get remortgage timing alerts.
        </p>
        <span className="tag tag-slate" style={{ alignSelf: 'flex-start' }}>Not set up</span>
      </div>
    )
  }

  const days  = daysUntil(property.mortgageFixEnd)
  const isPast   = days < 0
  const isUrgent = !isPast && days < 90
  const isWindow = !isPast && days >= 90 && days <= 180

  const statusColor = isPast ? '#ef4444' : isUrgent ? '#ef4444' : isWindow ? '#f59e0b' : 'var(--brand-400)'
  const statusLabel = isPast ? 'Deal expired — act now' : isUrgent ? 'Act now — switch imminent' : isWindow ? 'Ideal switch window' : 'Tracking — not yet time'

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>🏦</span>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--slate-900)', margin: 0 }}>Remortgage radar</p>
        <span className="tag" style={{ marginLeft: 'auto', background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}40` }}>
          {isPast ? 'Expired' : isUrgent ? 'Urgent' : isWindow ? 'Act now' : 'Tracking'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>Fix ends</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--slate-900)', margin: 0 }}>
            {new Date(property.mortgageFixEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        {property.mortgageRate && (
          <div>
            <p style={{ fontSize: 11, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>Rate</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--slate-900)', margin: 0 }}>{property.mortgageRate}%</p>
          </div>
        )}
        <div>
          <p style={{ fontSize: 11, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>
            {isPast ? 'Expired' : 'Days left'}
          </p>
          <p style={{ fontSize: 15, fontWeight: 600, color: statusColor, margin: 0 }}>
            {isPast ? `${Math.abs(days)} days ago` : `${days} days`}
          </p>
        </div>
      </div>

      <div style={{ background: `${statusColor}12`, border: `1px solid ${statusColor}30`, borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
        <p style={{ fontSize: 12, color: statusColor, margin: 0, fontWeight: 500 }}>{statusLabel}</p>
        <p style={{ fontSize: 12, color: 'var(--slate-500)', margin: '3px 0 0' }}>
          {isPast
            ? 'You\'re likely on your lender\'s SVR — remortgage immediately.'
            : isUrgent
            ? 'Start comparing rates now. Most offers take 3–6 weeks to complete.'
            : isWindow
            ? 'This is the ideal 6-month window to shop for a better deal without early repayment charges.'
            : `Start shopping ~${Math.ceil((days - 180) / 30)} months from now (6 months before fix end).`}
        </p>
      </div>
    </div>
  )
}

function MaintenanceCard({ property }: { property: StoredProperty }) {
  const flags = quickMaintenanceFlags(property.yearBuilt)

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>🔧</span>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--slate-900)', margin: 0 }}>Maintenance</p>
        {flags.some(f => f.urgency === 'urgent') && (
          <span className="tag" style={{ marginLeft: 'auto', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>Action needed</span>
        )}
      </div>

      {flags.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--slate-500)', margin: 0 }}>
          Add year built to see maintenance predictions.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {flags.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: URGENCY_COLOR[f.urgency], flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--slate-700)', flex: 1 }}>{f.label}</span>
              <span style={{ fontSize: 11, color: URGENCY_COLOR[f.urgency], textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>
                {f.urgency}
              </span>
            </div>
          ))}
        </div>
      )}

      <Link href="/tools/maintenance" style={{ fontSize: 13, color: 'var(--brand-400)', textDecoration: 'none', marginTop: 'auto' }}>
        Open maintenance calendar →
      </Link>
    </div>
  )
}

function DocumentsCard({ docCount }: { docCount: number }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>📁</span>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--slate-900)', margin: 0 }}>Document vault</p>
        <span className="tag tag-green" style={{ marginLeft: 'auto' }}>{docCount} file{docCount !== 1 ? 's' : ''}</span>
      </div>

      {docCount === 0 ? (
        <>
          <p style={{ fontSize: 13, color: 'var(--slate-500)', margin: 0 }}>
            Store your deeds, EPC certificate, service charge history, and warranties — all in one place.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {['Property deeds', 'EPC certificate', 'Gas Safe certificates', 'Warranties & manuals'].map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 6, height: 6, borderRadius: 1, border: '1.5px solid var(--slate-300)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>{c}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--slate-600)', margin: 0 }}>
          You have {docCount} document{docCount !== 1 ? 's' : ''} stored securely in your vault.
        </p>
      )}

      <Link href="/tools/documents" style={{ fontSize: 13, color: 'var(--brand-400)', textDecoration: 'none', marginTop: 'auto' }}>
        {docCount === 0 ? 'Add your first document →' : 'Open vault →'}
      </Link>
    </div>
  )
}

// ─── EPC upgrade banner ───────────────────────────────────────────────────────

const BAND_STEPS: Record<string, { steps: string[]; grants: string[]; urgency: 'none' | 'low' | 'high' }> = {
  C: { steps: [], grants: [], urgency: 'none' },
  B: { steps: [], grants: [], urgency: 'none' },
  A: { steps: [], grants: [], urgency: 'none' },
  D: {
    steps:   ['Loft insulation', 'Cavity wall insulation', 'Smart thermostat'],
    grants:  ['ECO4', 'Great British Insulation Scheme'],
    urgency: 'low',
  },
  E: {
    steps:   ['Loft + wall insulation', 'Heating system upgrade', 'Double glazing'],
    grants:  ['ECO4', 'Boiler Upgrade Scheme (£7,500)', 'Home Upgrade Grant'],
    urgency: 'high',
  },
  F: {
    steps:   ['Solid wall insulation', 'Heat pump or boiler upgrade', 'Glazing + controls'],
    grants:  ['ECO4', 'Boiler Upgrade Scheme (£7,500)', 'Home Upgrade Grant'],
    urgency: 'high',
  },
  G: {
    steps:   ['Major insulation works', 'Full heating system replacement', 'Windows + doors'],
    grants:  ['ECO4', 'Boiler Upgrade Scheme (£7,500)', 'Home Upgrade Grant'],
    urgency: 'high',
  },
}

function EPCUpgradeBanner({ property }: { property: StoredProperty }) {
  const band = (property.epcBand ?? 'D').toUpperCase()
  const info = BAND_STEPS[band] ?? BAND_STEPS['D']
  const alreadyC = info.urgency === 'none'

  if (alreadyC) {
    return (
      <div className="fade-up-d4" style={{
        background: '#f0fdf4', border: '1px solid #bbf7d0',
        borderRadius: 'var(--radius-xl)', padding: '20px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#16a34a' }}>✓ EPC Band {band} — 2030 target met</span>
          <p style={{ fontSize: 14, color: '#15803d', margin: '4px 0 0' }}>
            Your property already meets the government&apos;s Band C standard. You may still benefit from further improvements.
          </p>
        </div>
        <Link href="/dashboard/epc-upgrade" className="btn-ghost" style={{ fontSize: 13, padding: '8px 16px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          View improvement options →
        </Link>
      </div>
    )
  }

  return (
    <div className="fade-up-d4" style={{
      border: `1px solid ${info.urgency === 'high' ? '#fca5a5' : 'var(--brand-200)'}`,
      background: info.urgency === 'high' ? '#fef2f2' : 'var(--brand-50)',
      borderRadius: 'var(--radius-xl)', padding: '24px 28px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <span
            className="tag"
            style={{ marginBottom: 8, display: 'inline-block', background: info.urgency === 'high' ? '#fee2e2' : 'var(--brand-50)', color: info.urgency === 'high' ? '#dc2626' : 'var(--brand-800)' }}
          >
            EPC Band {band} · Upgrade needed · 2030 deadline
          </span>
          <h3 style={{ fontSize: 17, fontWeight: 500, color: 'var(--slate-900)', margin: '0 0 4px' }}>
            Your property needs to reach Band C
          </h3>
          <p style={{ fontSize: 13, color: 'var(--slate-500)', margin: 0 }}>
            {info.urgency === 'high'
              ? 'Significant works needed. Grants are available — check eligibility now.'
              : 'A few targeted upgrades should get you there. Grants are available.'}
          </p>
        </div>
        <Link href="/dashboard/epc-upgrade" className="btn-primary" style={{ fontSize: 13, padding: '9px 18px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          See full upgrade plan →
        </Link>
      </div>

      {/* What's needed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Typical steps for Band {band} → C
          </p>
          {info.steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0' }}>
              <span style={{ fontSize: 14, color: 'var(--brand-400)', fontWeight: 700 }}>{i + 1}.</span>
              <span style={{ fontSize: 13, color: 'var(--slate-700)' }}>{step}</span>
            </div>
          ))}
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Grants you may qualify for
          </p>
          {info.grants.map((grant, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0' }}>
              <span style={{ fontSize: 13, color: '#d97706' }}>✦</span>
              <span style={{ fontSize: 13, color: 'var(--slate-700)' }}>{grant}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function QuickActions({ property }: { property: StoredProperty }) {
  const actions = [
    {
      icon: '🔍',
      label: 'Property check',
      sub: 'Full due diligence report',
      href: `/homebuyer?postcode=${encodeURIComponent(property.postcode)}&address=${encodeURIComponent(property.address)}`,
      highlight: true,
    },
    { icon: '🏷️', label: 'Stamp duty',     sub: 'SDLT calculator',        href: '/tools/stamp-duty',      highlight: false },
    { icon: '📜', label: 'Lease extension', sub: 'Leaseholder premium',    href: '/tools/lease-extension', highlight: false },
    { icon: '🔧', label: 'Maintenance',     sub: 'Calendar & predictions', href: '/tools/maintenance',     highlight: false },
    { icon: '📁', label: 'Documents',       sub: 'Property file vault',    href: '/tools/documents',       highlight: false },
  ]

  return (
    <div className="card">
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
        Quick tools
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
        {actions.map((a, i) => (
          <Link
            key={i}
            href={a.href}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', borderRadius: 'var(--radius-md)',
              background: a.highlight ? 'var(--brand-50)' : 'var(--slate-50)',
              border: `1px solid ${a.highlight ? 'var(--brand-200)' : 'var(--slate-200)'}`,
              textDecoration: 'none',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            <span style={{ fontSize: 20, flexShrink: 0 }}>{a.icon}</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: a.highlight ? 'var(--brand-800)' : 'var(--slate-800)', margin: 0 }}>{a.label}</p>
              <p style={{ fontSize: 11, color: a.highlight ? 'var(--brand-600)' : 'var(--slate-400)', margin: 0 }}>{a.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function DashNav({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  return (
    <nav style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 32px', borderBottom: '1px solid var(--slate-200)',
      background: 'rgba(248,247,244,0.95)', backdropFilter: 'blur(12px)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: 'var(--slate-900)' }}>
          Prop<span style={{ color: 'var(--brand-400)' }}>Pilot</span>
        </span>
      </Link>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 500, color: 'var(--slate-800)', padding: '6px 12px', borderRadius: 8, background: 'var(--slate-100)', textDecoration: 'none' }}>Dashboard</Link>
        <Link href="/tools"     style={{ fontSize: 13, color: 'var(--slate-600)', padding: '6px 12px', textDecoration: 'none' }}>Tools</Link>
        <Link href="/homebuyer" style={{ fontSize: 13, color: 'var(--slate-600)', padding: '6px 12px', textDecoration: 'none' }}>Homebuyer check</Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
          <div style={{
            background: 'var(--brand-400)', color: '#fff', fontSize: 11, fontWeight: 600,
            padding: '3px 10px', borderRadius: 20, letterSpacing: '0.04em',
          }}>
            PRO
          </div>
          <span style={{ fontSize: 13, color: 'var(--slate-600)' }}>{user.name}</span>
          <button
            onClick={onSignOut}
            style={{
              fontSize: 13, color: 'var(--slate-500)', background: 'none',
              border: '1px solid var(--slate-200)', borderRadius: 8,
              padding: '5px 12px', cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [user,      setUser]      = useState<User | null>(null)
  const [property,  setProperty]  = useState<StoredProperty | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [docCount,  setDocCount]  = useState(0)
  const [ready,     setReady]     = useState(false)   // prevents SSR flash

  const loadState = useCallback(() => {
    const u = getUser()
    if (!u) { router.replace('/login'); return }
    setUser(u)
    const p = getProperty()
    setProperty(p)
    setShowSetup(!p)

    // Count documents from vault localStorage key
    try {
      const docs = JSON.parse(localStorage.getItem('pp_documents') ?? '[]')
      setDocCount(Array.isArray(docs) ? docs.length : 0)
    } catch { setDocCount(0) }

    setReady(true)
  }, [router])

  useEffect(() => { loadState() }, [loadState])

  const handleSignOut = () => {
    logout()
    router.push('/')
  }

  const handlePropertySaved = (p: StoredProperty) => {
    setProperty(p)
    setShowSetup(false)
  }

  if (!ready || !user) return null  // avoid flash before auth check

  return (
    <div style={{ minHeight: '100vh', background: 'var(--slate-50)' }}>
      <DashNav user={user} onSignOut={handleSignOut} />

      {showSetup ? (
        <SetupWizard onSave={handlePropertySaved} />
      ) : property ? (
        <main style={{ maxWidth: 1060, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Page header */}
          <div className="fade-up" style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 24, fontWeight: 500, color: 'var(--slate-900)', margin: 0 }}>
              {greeting()}, {user.name.split(' ')[0]}
            </h1>
            <span className="tag tag-green">Homeowner Pro</span>
          </div>

          {/* Property hero card */}
          <div className="fade-up-d1">
            <PropertyCard property={property} onEdit={() => { clearProperty(); setShowSetup(true) }} />
          </div>

          {/* Three widgets */}
          <div className="fade-up-d2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <RemortgageCard property={property} />
            <MaintenanceCard property={property} />
            <DocumentsCard docCount={docCount} />
          </div>

          {/* Quick actions */}
          <div className="fade-up-d3">
            <QuickActions property={property} />
          </div>

          {/* EPC upgrade section */}
          {property.epcBand && (
            <EPCUpgradeBanner property={property} />
          )}
        </main>
      ) : null}
    </div>
  )
}
