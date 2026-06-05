'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { NavBar } from '../components/NavBar'
import { Footer } from '../components/Footer'
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

/** Extract house number and street from a full address string. */
function parseHouseAndStreet(fullAddress: string): { houseNumber: string; street: string } {
  const firstLine = fullAddress.split(',')[0].trim()
  // Match leading number (with optional letter suffix) then street name
  const m = firstLine.match(/^(\d+[A-Za-z]?)\s+(.+)$/i)
  if (m) return { houseNumber: m[1], street: m[2] }
  // Flat / Apartment prefix: e.g. "FLAT 3 14 HIGH STREET"
  const flat = firstLine.match(/^((?:FLAT|APT|APARTMENT|UNIT)\s+\S+)\s+(\d+[A-Za-z]?)\s+(.+)$/i)
  if (flat) return { houseNumber: `${flat[1]} ${flat[2]}`, street: flat[3] }
  return { houseNumber: '', street: firstLine }
}

function SetupWizard({ onSave }: { onSave: (p: StoredProperty) => void }) {
  // ── Address lookup state ───────────────────────────────────────────────────
  const [postcodeInput,      setPostcodeInput]      = useState('')
  const [addressOptions,     setAddressOptions]     = useState<{ uprn: number; address: string }[]>([])
  const [selectedUprn,       setSelectedUprn]       = useState<number | null>(null)
  const [loadingAddresses,   setLoadingAddresses]   = useState(false)
  const [addressLookupDone,  setAddressLookupDone]  = useState(false)
  const [addressLookupError, setAddressLookupError] = useState('')
  const [addressConfirmed,   setAddressConfirmed]   = useState(false)

  // ── Property details form state ────────────────────────────────────────────
  const [form, setForm] = useState({
    postcode:       '',
    houseNumber:    '',
    street:         '',
    address:        '',
    tenure:         'Freehold' as 'Freehold' | 'Leasehold',
    purchasePrice:  '',
    purchaseDate:   '',
    yearBuilt:      '',
    epcBand:        '',
    estimatedValue: '',
    mortgageFixEnd: '',
    mortgageRate:   '',
  })
  const [epcLoading, setEpcLoading] = useState(false)
  const [epcStatus,  setEpcStatus]  = useState<string | null>(null)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  // ── Load sample ────────────────────────────────────────────────────────────
  const loadSample = () => {
    setPostcodeInput(SAMPLE_PROPERTY.postcode)
    setAddressOptions([])
    setSelectedUprn(null)
    setAddressLookupDone(false)
    setAddressLookupError('')
    setAddressConfirmed(true)
    setForm({
      postcode:       SAMPLE_PROPERTY.postcode,
      houseNumber:    SAMPLE_PROPERTY.houseNumber,
      street:         SAMPLE_PROPERTY.street,
      address:        SAMPLE_PROPERTY.address,
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

  // ── Step 1: look up addresses by postcode ──────────────────────────────────
  const fetchAddresses = async (pc: string) => {
    const clean = pc.trim().replace(/\s+/g, '').toUpperCase()
    if (clean.length < 5) return
    setLoadingAddresses(true)
    setAddressLookupDone(false)
    setAddressOptions([])
    setSelectedUprn(null)
    setAddressLookupError('')
    setAddressConfirmed(false)
    try {
      const res  = await fetch(`/api/address-lookup/${encodeURIComponent(clean)}`)
      const data = await res.json()
      if (res.ok && Array.isArray(data) && data.length > 0) {
        setAddressOptions(data)
      } else {
        setAddressLookupError(data?.error ?? 'No addresses found for this postcode.')
      }
    } catch (e) {
      setAddressLookupError(e instanceof Error ? e.message : 'Network error — please try again.')
    }
    setLoadingAddresses(false)
    setAddressLookupDone(true)
  }

  // ── Step 2: auto-fill form when address is chosen ─────────────────────────
  const handleAddressSelect = async (uprn: number) => {
    const opt = addressOptions.find(o => o.uprn === uprn)
    if (!opt) return
    setSelectedUprn(uprn)
    const { houseNumber, street } = parseHouseAndStreet(opt.address)
    const postcode = postcodeInput.trim().replace(/\s+/g, ' ').toUpperCase()
    setForm(f => ({ ...f, postcode, houseNumber, street, address: opt.address }))
    setAddressConfirmed(true)

    // Auto-trigger EPC lookup
    setEpcLoading(true)
    setEpcStatus('Looking up EPC certificate…')
    try {
      const pc  = postcode.replace(/\s/g, '').toUpperCase()
      const res = await fetch(`/api/epc/${encodeURIComponent(pc)}?address=${encodeURIComponent(opt.address)}`)
      const data = await res.json()
      if (data.found && data.certificate) {
        const cert = data.certificate
        setForm(f => ({ ...f, epcBand: cert.currentBand ?? f.epcBand }))
        setEpcStatus(`✓ EPC found — Band ${cert.currentBand} (score ${cert.currentScore}/100)`)
      } else {
        setEpcStatus('No EPC certificate found — fill in manually if known')
      }
    } catch {
      setEpcStatus('Could not fetch EPC — fill in manually if known')
    }
    setEpcLoading(false)
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const p: StoredProperty = {
      postcode:       form.postcode || postcodeInput.trim().toUpperCase(),
      houseNumber:    form.houseNumber,
      street:         form.street,
      address:        form.address || `${form.houseNumber} ${form.street}, ${form.postcode.toUpperCase()}`,
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
  const sectionLabel: React.CSSProperties = {
    fontSize: 13, fontWeight: 600, color: 'var(--slate-500)',
    letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16,
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <span className="tag tag-green" style={{ marginBottom: 12, display: 'inline-block' }}>Setup</span>
        <h2 style={{ fontSize: 26, fontWeight: 500, color: 'var(--slate-900)', marginBottom: 10 }}>
          Add your property
        </h2>
        <p style={{ fontSize: 14, color: 'var(--slate-500)', maxWidth: 400, margin: '0 auto' }}>
          Search by postcode to find your address, then fill in your property details.
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
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--brand-800)', margin: 0 }}>Load sample property</p>
          <p style={{ fontSize: 12, color: 'var(--brand-600)', margin: 0 }}>14 Alderton Close, Milton Keynes — demo the full dashboard</p>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--brand-400)' }}>Click →</span>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: 28 }}>

        {/* ── Step 1: Postcode search ──────────────────────────────────────── */}
        <p style={sectionLabel}>Find your property</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Postcode *</label>
            <input
              style={inputStyle}
              value={postcodeInput}
              onChange={e => {
                setPostcodeInput(e.target.value)
                setAddressOptions([])
                setSelectedUprn(null)
                setAddressLookupDone(false)
                setAddressConfirmed(false)
                set('postcode', '')
              }}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), fetchAddresses(postcodeInput))}
              placeholder="e.g. SW1A 1AA"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => fetchAddresses(postcodeInput)}
              disabled={loadingAddresses || postcodeInput.trim().length < 5}
              style={{
                height: 42, padding: '0 16px', fontSize: 13, fontWeight: 500,
                background: 'var(--slate-900)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-md)',
                cursor: loadingAddresses || postcodeInput.trim().length < 5 ? 'not-allowed' : 'pointer',
                opacity: postcodeInput.trim().length < 5 ? 0.45 : 1,
                fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
              }}
            >
              {loadingAddresses ? '⏳ Searching…' : '🔍 Find addresses'}
            </button>
          </div>
        </div>

        {/* Address dropdown */}
        {addressOptions.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Select your address *</label>
            <select
              value={selectedUprn ?? ''}
              onChange={e => {
                const uprn = Number(e.target.value)
                if (uprn) handleAddressSelect(uprn)
              }}
              style={{ ...inputStyle, cursor: 'pointer', height: 42 }}
            >
              <option value="">— Choose your address —</option>
              {addressOptions.map(opt => (
                <option key={opt.uprn} value={opt.uprn}>{opt.address}</option>
              ))}
            </select>
          </div>
        )}

        {/* EPC status */}
        {epcStatus && (
          <p style={{
            fontSize: 12, margin: '0 0 12px',
            color: epcStatus.startsWith('✓') ? 'var(--brand-600)' : 'var(--slate-400)',
          }}>
            {epcLoading ? '⏳ ' : ''}{epcStatus}
          </p>
        )}

        {/* Address lookup error */}
        {addressLookupDone && addressOptions.length === 0 && !loadingAddresses && addressLookupError && (
          <div style={{
            marginBottom: 12, background: '#fff1f2', border: '1px solid #fda4af',
            borderRadius: 'var(--radius-md)', padding: '10px 14px',
            fontSize: 12, color: '#9f1239',
          }}>
            {addressLookupError}
          </div>
        )}

        {/* Confirmed address pill */}
        {addressConfirmed && form.address && (
          <div style={{
            marginBottom: 16, background: '#f0fdf4', border: '1px solid #86efac',
            borderRadius: 'var(--radius-md)', padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 14 }}>✓</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#14532d', margin: 0 }}>{form.address}</p>
              <p style={{ fontSize: 11, color: '#166534', margin: '2px 0 0' }}>{form.postcode}</p>
            </div>
          </div>
        )}

        {/* Tenure — always visible */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Tenure</label>
          <select value={form.tenure} onChange={e => set('tenure', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="Freehold">Freehold</option>
            <option value="Leasehold">Leasehold</option>
          </select>
        </div>

        {/* ── Step 2: Property details (shown once address confirmed) ─────── */}
        {addressConfirmed && (
          <>
            <div style={{ height: 1, background: 'var(--slate-100)', margin: '8px 0 20px' }} />
            <p style={sectionLabel}>Property details</p>
            <div className="pp-form-grid-3">
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

            <p style={sectionLabel}>Purchase & mortgage</p>
            <div className="pp-form-grid-2">
              <div>
                <label style={labelStyle}>Purchase price</label>
                <input style={inputStyle} type="number" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} placeholder="285000" />
              </div>
              <div>
                <label style={labelStyle}>Purchase date</label>
                <input style={inputStyle} type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} />
              </div>
            </div>
            <div className="pp-form-grid-2" style={{ marginBottom: 0 }}>
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
          </>
        )}

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
    <div className="card pp-property-card-grid" style={{ gridColumn: '1 / -1' }}>
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
          href={`/tools/property-report?postcode=${encodeURIComponent(property.postcode)}&address=${encodeURIComponent(property.address)}`}
          className="btn-primary"
          style={{ fontSize: 13, padding: '9px 16px', whiteSpace: 'nowrap' }}
        >
          Run property report
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
      <div className="pp-grid-epc-steps">
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

// ─── PropHealth Score widget ──────────────────────────────────────────────────

function PropHealthScore({ property }: { property: StoredProperty }) {
  // Derive a composite health score from what we know
  const checks: { label: string; status: 'pass' | 'warn' | 'fail' | 'info'; detail: string; href?: string }[] = []

  // EPC
  const band = (property.epcBand ?? 'D').toUpperCase()
  checks.push({
    label: `EPC: Band ${band}`,
    status: ['A','B','C'].includes(band) ? 'pass' : ['E','F','G'].includes(band) ? 'fail' : 'warn',
    detail: ['A','B','C'].includes(band) ? '2030 target met' : 'Upgrade needed by 2030',
    href:   '/dashboard/epc-upgrade',
  })

  // Remortgage
  if (property.mortgageFixEnd) {
    const days = Math.ceil((new Date(property.mortgageFixEnd).getTime() - Date.now()) / 86400000)
    checks.push({
      label: days < 0 ? 'Mortgage: expired' : days < 90 ? 'Mortgage: act now' : 'Mortgage: tracked',
      status: days < 0 ? 'fail' : days < 90 ? 'warn' : 'pass',
      detail: days < 0 ? 'Likely on SVR — switch now' : days < 90 ? `${days} days to fix end` : `Fix ends in ${Math.round(days/30)} months`,
      href:   '/tools/mortgage-prisoner',
    })
  }

  // Tenure
  const isLeasehold = property.tenure?.toLowerCase().includes('leasehold')
  checks.push({
    label: isLeasehold ? 'Tenure: Leasehold' : 'Tenure: Freehold',
    status: isLeasehold ? 'warn' : 'pass',
    detail: isLeasehold ? 'Check ground rent & lease length' : 'No leasehold obligations',
    href:   isLeasehold ? '/tools/ground-rent' : undefined,
  })

  // Property age (maintenance)
  if (property.yearBuilt) {
    const age = new Date().getFullYear() - property.yearBuilt
    checks.push({
      label: `Built ${property.yearBuilt}`,
      status: age > 50 ? 'warn' : 'pass',
      detail: age > 50 ? 'Older property — elevated maintenance risk' : 'Standard maintenance profile',
      href:   '/tools/maintenance',
    })
  }

  // Document vault
  checks.push({
    label: 'Documents',
    status: 'info',
    detail: 'Keep your certificates up to date',
    href:   '/tools/documents',
  })

  // Score (pass=2, warn=1, fail=0, info=1)
  const scores: Record<string, number> = { pass: 2, warn: 1, fail: 0, info: 1 }
  const total = checks.reduce((sum, c) => sum + scores[c.status], 0)
  const max   = checks.length * 2
  const pct   = Math.round((total / max) * 100)

  const scoreColor = pct >= 80 ? '#1D9E75' : pct >= 55 ? '#f59e0b' : '#ef4444'
  const statusIcons: Record<string, string> = { pass: '✓', warn: '!', fail: '✗', info: '·' }
  const statusColors: Record<string, string> = {
    pass: '#1D9E75', warn: '#f59e0b', fail: '#ef4444', info: 'var(--slate-400)',
  }

  return (
    <div className="card fade-up-d3" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🏠</span>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--slate-900)', margin: 0 }}>PropHealth Score</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: scoreColor, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{pct}</span>
          <span style={{ fontSize: 10, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>/ 100</span>
        </div>
      </div>

      {/* Score bar */}
      <div style={{ height: 6, background: 'var(--slate-100)', borderRadius: 3, marginBottom: 18, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: scoreColor, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>

      {/* Checks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {checks.map((c, i) => (
          <div
            key={i}
            onClick={() => c.href && (window.location.href = c.href)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 8, cursor: c.href ? 'pointer' : 'default',
              background: 'var(--slate-50)', border: '1px solid var(--slate-100)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => c.href && ((e.currentTarget as HTMLDivElement).style.background = 'var(--brand-50)')}
            onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = 'var(--slate-50)')}
          >
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              background: `${statusColors[c.status]}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: statusColors[c.status] }}>{statusIcons[c.status]}</span>
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--slate-800)' }}>{c.label}</span>
              <span style={{ fontSize: 12, color: 'var(--slate-400)', marginLeft: 8 }}>{c.detail}</span>
            </div>
            {c.href && <span style={{ fontSize: 11, color: 'var(--brand-400)' }}>→</span>}
          </div>
        ))}
      </div>

      {/* Niche tools promo */}
      <div style={{ marginTop: 16, background: '#04342C', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <p style={{ fontSize: 12, color: '#9FE1CB', margin: 0 }}>🇬🇧 Help to Buy? Leasehold? Mortgage prisoner?</p>
        <a href="/tools" style={{ fontSize: 12, fontWeight: 600, color: '#5DCAA5', textDecoration: 'none', whiteSpace: 'nowrap' }}>Niche tools →</a>
      </div>
    </div>
  )
}

function QuickActions({ property }: { property: StoredProperty }) {
  const actions = [
    {
      icon: '🔍',
      label: 'Property report',
      sub: 'Flood, EPC, crime & more',
      href: `/tools/property-report?postcode=${encodeURIComponent(property.postcode)}&address=${encodeURIComponent(property.address)}`,
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

const OWNER_NAV_LINKS = [
  { label: 'Dashboard',        href: '/dashboard' },
  { label: 'Property report',  href: '/tools/property-report' },
  { label: 'Niche tools',      href: '/tools' },
  { label: 'Maintenance',      href: '/tools/maintenance' },
  { label: 'Documents',        href: '/tools/documents' },
  { label: 'EPC upgrade',      href: '/dashboard/epc-upgrade' },
]

function DashNav({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const planColor = user.plan === 'free' ? { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' }
                  : { bg: '#dcfce7', text: '#15803d', border: '#86efac' }
  return (
    <NavBar
      logoHref="/dashboard"
      rightSlot={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {OWNER_NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href}
              style={{ fontSize: 13, color: 'var(--slate-600)', padding: '6px 10px', textDecoration: 'none', borderRadius: 8 }}
            >
              {l.label}
            </Link>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.04em', textTransform: 'uppercase', background: planColor.bg, color: planColor.text, border: `1px solid ${planColor.border}` }}>
              {user.plan}
            </span>
            <span style={{ fontSize: 13, color: 'var(--slate-600)' }}>{user.name.split(' ')[0]}</span>
            <button onClick={onSignOut} style={{ fontSize: 13, color: 'var(--slate-500)', background: 'none', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Sign out
            </button>
          </div>
        </div>
      }
      mobileItems={[
        ...OWNER_NAV_LINKS.map(l => ({ label: l.label, href: l.href })),
        { label: 'Sign out', onClick: onSignOut },
      ]}
    />
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
    // Buyers have their own dashboard
    if (u.role === 'buyer') { router.replace('/dashboard/buyer'); return }
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
    <div style={{ minHeight: '100vh', background: 'var(--slate-50)', display: 'flex', flexDirection: 'column' }}>
      <DashNav user={user} onSignOut={handleSignOut} />

      {showSetup ? (
        <SetupWizard onSave={handlePropertySaved} />
      ) : property ? (
        <main style={{ maxWidth: 1060, margin: '0 auto', padding: '32px clamp(16px,3vw,24px)', display: 'flex', flexDirection: 'column', gap: 20 }}>

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
          <div className="fade-up-d2 pp-grid-3">
            <RemortgageCard property={property} />
            <MaintenanceCard property={property} />
            <DocumentsCard docCount={docCount} />
          </div>

          {/* PropHealth Score + Quick actions side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }} className="pp-score-grid">
            <PropHealthScore property={property} />
            <div className="fade-up-d3">
              <QuickActions property={property} />
            </div>
          </div>

          {/* EPC upgrade section */}
          {property.epcBand && (
            <EPCUpgradeBanner property={property} />
          )}
        </main>
      ) : null}
      <Footer />
    </div>
  )
}
