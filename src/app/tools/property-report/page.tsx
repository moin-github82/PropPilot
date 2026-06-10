'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { SiteNav } from '../../components/SiteNav'
import { Footer } from '../../components/Footer'
import { RequireAuth } from '../../components/RequireAuth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FloodResult {
  riskLevel:      'high' | 'medium' | 'low' | 'very-low'
  riskLabel:      string
  activeWarnings: number
  activeAlerts:   number
  floodAreaCount: number
  description:    string
  checkUrl:       string
}

interface EpcResult {
  found:    boolean
  message?: string
  certificate?: {
    address:        string
    currentBand:    string
    potentialBand:  string
    currentScore:   number
    potentialScore: number
    propertyType:   string
    lodgementDate:  string
    yearsOld:       number
    isStale:        boolean
    mainFuel:       string
  }
  upgradeRecommendations?: { measure: string; saving: string; cost: string }[]
}

interface CrimeResult {
  totalIncidents:    number
  monthsAnalysed:    number
  incidentsPerMonth: number
  topCategories:     { category: string; count: number }[]
  dataDate:          string
  /** Set when crime data is unavailable for this region (e.g. Scotland) */
  message?:  string
  checkUrl?: string
}

interface BroadbandResult {
  configured:      boolean
  technologyType?: string
  maxDownloadMbps?: number
  maxUploadMbps?:  number
  gigabitCapable?: boolean
  superfast?:      boolean
  coverage4G?:     boolean
  coverage5G?:     boolean
  checkUrl?:       string
  message?:        string
}

interface CouncilTaxResult {
  localAuthority:     string
  voaLookupUrl:       string
  challengeGuideUrl:  string
  actualBand:         string | null
  actualAnnualRate:   number | null
  avgBandDRate:       number | null
  bandRates:          Record<string, number> | null
  appealDeadlineNote: string
}


interface PlanningApplication {
  reference:    string
  description:  string
  status:       string
  decisionType: 'approved' | 'refused' | 'withdrawn' | 'pending' | 'unknown'
  date:         string | null
}

interface PlanningResult {
  inConservationArea:     boolean
  conservationAreaName:   string | null
  listedBuilding:         boolean
  listedBuildingGrade:    string | null
  articleFourDirection:   boolean
  articleFourDescription: string | null
  propertyApplications:   PlanningApplication[]
  nearbyApplications:     PlanningApplication[]
  applicationsFound:      number
  lpaName:                string
  lpaSearchUrl:           string
  lpaApplicationsUrl:     string
  postcode:               string
}

interface ReportData {
  address:     string
  postcode:    string
  generatedAt: string
  flood:       FloodResult   | null
  epc:         EpcResult     | null
  crime:       CrimeResult   | null
  broadband:   BroadbandResult | null
  councilTax:  CouncilTaxResult | null
  planning:    PlanningResult | null
  errors:      Record<string, string>
}

type CheckStatus = 'idle' | 'loading' | 'done' | 'error'

interface CheckState {
  flood:      CheckStatus
  epc:        CheckStatus
  crime:      CheckStatus
  broadband:  CheckStatus
  councilTax: CheckStatus
  planning:   CheckStatus
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Scottish postcode area codes (for client-side Scotland detection)
const SCOTLAND_AREAS = new Set(['AB','DD','DG','EH','FK','G','HS','IV','KA','KW','KY','ML','PA','PH','TD','ZE'])
const isScottishPc = (pc: string) =>
  SCOTLAND_AREAS.has(pc.replace(/\s/g,'').toUpperCase().match(/^[A-Z]+/)?.[0] ?? '')

const BAND_COLORS: Record<string, string> = {
  A: '#00b050', B: '#19b450', C: '#8dc63f',
  D: '#ffff00', E: '#fcb514', F: '#f7941e', G: '#ed1c24',
}

const RISK_STYLES: Record<string, { bg: string; border: string; color: string; dot: string }> = {
  'high':      { bg: '#fff1f2', border: '#fda4af', color: '#9f1239', dot: '🔴' },
  'medium':    { bg: '#fffbeb', border: '#fcd34d', color: '#451a03', dot: '🟡' },
  'low':       { bg: '#f0fdf4', border: '#86efac', color: '#14532d', dot: '🟢' },
  'very-low':  { bg: '#f0fdf4', border: '#86efac', color: '#14532d', dot: '🟢' },
}

function crimeRating(perMonth: number): { label: string; color: string; bg: string; border: string } {
  if (perMonth < 10)  return { label: 'Low',    color: '#14532d', bg: '#f0fdf4', border: '#86efac' }
  if (perMonth < 25)  return { label: 'Medium', color: '#451a03', bg: '#fffbeb', border: '#fcd34d' }
  return                     { label: 'High',   color: '#9f1239', bg: '#fff1f2', border: '#fda4af' }
}

function broadbandRating(mbps: number): { label: string; color: string } {
  if (mbps >= 1000) return { label: 'Gigabit', color: '#14532d' }
  if (mbps >= 300)  return { label: 'Ultrafast', color: '#14532d' }
  if (mbps >= 30)   return { label: 'Superfast', color: '#166534' }
  if (mbps >= 10)   return { label: 'Adequate', color: '#451a03' }
  return                   { label: 'Slow', color: '#9f1239' }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PropertyReportPage() {
  const [address,        setAddress]        = useState('')
  const [postcode,       setPostcode]       = useState('')
  const [report,         setReport]         = useState<ReportData | null>(null)
  const [checkState,     setCheckState]     = useState<CheckState>({ flood: 'idle', epc: 'idle', crime: 'idle', broadband: 'idle', councilTax: 'idle', planning: 'idle' })
  const [running,        setRunning]        = useState(false)
  // Address autocomplete
  const [searchQuery,      setSearchQuery]      = useState('')
  const [suggestions,      setSuggestions]      = useState<{ uprn: number; address: string; postcode: string; town: string }[]>([])
  const [selectedUprn,     setSelectedUprn]     = useState<number | null>(null)
  const [searchLoading,    setSearchLoading]    = useState(false)
  const [showSuggestions,  setShowSuggestions]  = useState(false)
  const [searchError,      setSearchError]      = useState('')
  const [confirmed,        setConfirmed]        = useState(false)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const searchAddresses = useCallback(async (q: string) => {
    if (q.trim().length < 3) { setSuggestions([]); setShowSuggestions(false); return }
    setSearchLoading(true)
    setSearchError('')
    try {
      const res = await fetch(`/api/address-search?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      if (res.ok && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions)
        setShowSuggestions(data.suggestions.length > 0)
      } else {
        setSearchError(data.error ?? 'Search failed')
        setSuggestions([])
        setShowSuggestions(false)
      }
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Network error')
    }
    setSearchLoading(false)
  }, [])

  const handleSearchInput = (value: string) => {
    setSearchQuery(value)
    setConfirmed(false)
    setSelectedUprn(null)
    setAddress('')
    setPostcode('')
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => searchAddresses(value), 300)
  }

  const selectSuggestion = (s: { uprn: number; address: string; postcode: string; town: string }) => {
    const fullAddress = s.town ? `${s.address}, ${s.town}` : s.address
    setSearchQuery(`${s.address}, ${s.postcode}`)
    setAddress(fullAddress)
    setPostcode(s.postcode)
    setSelectedUprn(s.uprn)
    setSuggestions([])
    setShowSuggestions(false)
    setConfirmed(true)
  }

  const setCheck = (key: keyof CheckState, status: CheckStatus) =>
    setCheckState(prev => ({ ...prev, [key]: status }))

  const runReport = async () => {
    const pc = postcode.trim().replace(/\s+/g, ' ').toUpperCase()
    if (!pc || pc.length < 5) return

    setRunning(true)
    setReport(null)
    setCheckState({ flood: 'loading', epc: 'loading', crime: 'loading', broadband: 'loading', councilTax: 'loading', planning: 'loading' })

    const errors: Record<string, string> = {}
    const encoded = encodeURIComponent(pc)
    const addrQ   = address.trim() ? `?address=${encodeURIComponent(address.trim())}` : ''
    const epcParams = new URLSearchParams()
    if (address.trim()) epcParams.set('address', address.trim())
    if (selectedUprn) epcParams.set('uprn', String(selectedUprn))
    const epcQ = epcParams.toString() ? `?${epcParams.toString()}` : ''

    const fetchCheck = async <T,>(key: keyof CheckState, url: string): Promise<T | null> => {
      try {
        const res = await fetch(url)
        const data = await res.json()
        if (!res.ok) {
          errors[key] = data?.error ?? `HTTP ${res.status}`
          setCheck(key, 'error')
          return null
        }
        setCheck(key, 'done')
        return data as T
      } catch (e) {
        errors[key] = e instanceof Error ? e.message : 'Network error'
        setCheck(key, 'error')
        return null
      }
    }

    const [flood, epcRaw, crime, broadband, councilTax, planning] = await Promise.all([
      fetchCheck<FloodResult>('flood',      `/api/flood-risk/${encoded}`),
      fetchCheck<EpcResult>  ('epc',        `/api/epc/${encoded}${epcQ}`),
      fetchCheck<CrimeResult>('crime',      `/api/crime/${encoded}`),
      fetchCheck<BroadbandResult>('broadband',  `/api/broadband/${encoded}`),
      fetchCheck<CouncilTaxResult>('councilTax', selectedUprn ? `/api/council-tax/${encoded}?uprn=${selectedUprn}` : `/api/council-tax/${encoded}${addrQ}`),
      fetchCheck<PlanningResult>('planning', `/api/planning/${encoded}`),
    ])

    // Broadband returns 503 with configured:false — treat as partial data
    const broadbandData = broadband ?? null

    setReport({
      address:     address.trim(),
      postcode:    pc,
      generatedAt: new Date().toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      flood,
      epc:         epcRaw,
      crime,
      broadband:   broadbandData,
      councilTax,
      planning,
      errors,
    })

    setRunning(false)
  }

  const printReport = () => window.print()

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 48, padding: '0 14px', fontSize: 15,
    border: '1.5px solid #e2ddd6', borderRadius: 10,
    background: '#fff', color: '#1a1917', fontFamily: 'var(--font-body)',
    outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#5e5a52', display: 'block', marginBottom: 6 }
  const sectionHead: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: '#1a1917', margin: '0 0 4px' }
  const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2ddd6', borderRadius: 14, padding: '24px', marginBottom: 16 }

  const CHECK_LABELS: Record<keyof CheckState, string> = {
    flood:      '🌊 Flood risk',
    epc:        '⚡ EPC energy rating',
    crime:      '🚨 Crime statistics',
    broadband:  '📡 Broadband & mobile',
    councilTax: '🏛️ Council tax',
    planning:   '🏗️ Planning applications',
  }

  return (
    <RequireAuth>
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-card { break-inside: avoid; }
          nav, header { display: none !important; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f8f7f4', display: 'flex', flexDirection: 'column' }}>
        <SiteNav />

        <main style={{ maxWidth: 760, margin: '0 auto', width: '100%', flex: 1, padding: 'clamp(32px,5vw,48px) clamp(16px,4vw,40px) 80px' }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }} className="no-print">
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9e998f', display: 'block', marginBottom: 8 }}>Free tool</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,3vw,36px)', fontWeight: 500, color: '#1a1917', margin: '0 0 12px' }}>Property Due Diligence Report</h1>
            <p style={{ fontSize: 15, color: '#5e5a52', lineHeight: 1.7, margin: 0 }}>
              Enter a property address and postcode to automatically run flood risk, EPC, crime, broadband, and council tax checks — all in one report.
            </p>
          </div>

          {/* Input form */}
          <div style={{ ...card, border: '1px solid #1D9E75' }} className="no-print">

            {/* Address autocomplete search */}
            <div style={{ marginBottom: 14 }} ref={searchRef}>
              <label style={labelStyle}>Search by address or postcode</label>
              <div style={{ position: 'relative' }}>
                <input
                  value={searchQuery}
                  onChange={e => handleSearchInput(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="e.g. 14 High Street, Leeds or LS1 4BR"
                  style={{ ...inputStyle, paddingRight: 40 }}
                  autoComplete="off"
                />
                {searchLoading && (
                  <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>⏳</span>
                )}
                {confirmed && !searchLoading && (
                  <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#1D9E75' }}>✓</span>
                )}

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: '#fff', border: '1.5px solid #1D9E75', borderTop: 'none',
                    borderRadius: '0 0 10px 10px', maxHeight: 260, overflowY: 'auto',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                  }}>
                    {suggestions.map((s, i) => (
                      <button
                        key={s.uprn}
                        onMouseDown={() => selectSuggestion(s)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '10px 14px', fontSize: 13, color: '#1a1917',
                          background: 'transparent', border: 'none',
                          borderBottom: i < suggestions.length - 1 ? '1px solid #f0ede8' : 'none',
                          cursor: 'pointer', fontFamily: 'var(--font-body)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8f7f4')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ fontWeight: 500 }}>{s.address}</span>
                        {s.town && <span style={{ color: '#9e998f' }}>, {s.town}</span>}
                        <span style={{ color: '#1D9E75', marginLeft: 8, fontSize: 12 }}>{s.postcode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search error */}
              {searchError && (
                <p style={{ fontSize: 11, color: '#9f1239', margin: '5px 0 0' }}>
                  {searchError.includes('503') || searchError.toLowerCase().includes('not configured')
                    ? <>Address search requires a valid <code>HOMEDATA_API_KEY</code> — get a free key at <a href="https://homedata.co.uk/register" target="_blank" rel="noreferrer" style={{color:'#9f1239'}}>homedata.co.uk/register</a></>
                    : `Search error: ${searchError}`}
                </p>
              )}

              {/* Confirmed selection chip */}
              {confirmed && postcode && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, background: '#f0fdf4', border: '1px solid #86efac', color: '#14532d', borderRadius: 20, padding: '3px 10px', fontWeight: 500 }}>
                    ✓ {postcode}
                  </span>
                  {selectedUprn && (
                    <span style={{ fontSize: 11, color: '#9e998f' }}>
                      UPRN {selectedUprn} · EPC &amp; council tax will use exact property data
                    </span>
                  )}
                  <button
                    onClick={() => { setSearchQuery(''); setAddress(''); setPostcode(''); setSelectedUprn(null); setConfirmed(false); setSuggestions([]); }}
                    style={{ fontSize: 11, color: '#9e998f', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Manual postcode fallback */}
              {!confirmed && (
                <p style={{ fontSize: 11, color: '#9e998f', margin: '6px 0 0' }}>
                  Can&apos;t find your address?{' '}
                  <button
                    onClick={() => {
                      const pc = searchQuery.replace(/\s/g, '').toUpperCase()
                      if (pc.length >= 5) { setPostcode(pc); setConfirmed(true) }
                    }}
                    style={{ fontSize: 11, color: '#1D9E75', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: 'var(--font-body)' }}
                  >
                    Use postcode only
                  </button>
                </p>
              )}
            </div>

            <button
              onClick={runReport}
              disabled={running || !postcode.trim()}
              style={{ width: '100%', height: 48, fontSize: 15, fontWeight: 500, background: running ? '#9e998f' : (!postcode.trim() ? '#b5b0a7' : '#1D9E75'), color: '#fff', border: 'none', borderRadius: 10, cursor: (running || !postcode.trim()) ? 'default' : 'pointer', fontFamily: 'var(--font-body)', transition: 'background 0.2s' }}
            >
              {running ? 'Running checks…' : '▶ Generate property report'}
            </button>
          </div>

          {/* Progress indicator */}
          {running && (
            <div style={{ ...card }} className="no-print">
              <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1917', margin: '0 0 14px' }}>Checking property data…</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(Object.entries(CHECK_LABELS) as [keyof CheckState, string][]).map(([key, label]) => {
                  const s = checkState[key]
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 16 }}>
                        {s === 'loading' ? '⏳' : s === 'done' ? '✅' : s === 'error' ? '⚠️' : '⬜'}
                      </span>
                      <span style={{ fontSize: 13, color: s === 'done' ? '#14532d' : s === 'error' ? '#9f1239' : '#5e5a52' }}>{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── REPORT ── */}
          {report && (
            <div ref={reportRef}>

              {/* Report header */}
              <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9e998f', margin: '0 0 4px' }}>Property Due Diligence Report</p>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: '#1a1917', margin: '0 0 4px' }}>
                    {report.address ? `${report.address}, ` : ''}{report.postcode}
                  </h2>
                  <p style={{ fontSize: 12, color: '#9e998f', margin: 0 }}>Generated {report.generatedAt}</p>
                </div>
                <button onClick={printReport} className="no-print" style={{ height: 38, padding: '0 16px', fontSize: 13, fontWeight: 500, background: '#1a1917', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  🖨️ Save / Print PDF
                </button>
              </div>

              {/* Summary strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
                {/* Flood */}
                {report.flood && (() => {
                  const s = RISK_STYLES[report.flood.riskLevel]
                  return (
                    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '12px 14px' }}>
                      <p style={{ fontSize: 11, color: s.color, margin: '0 0 4px', fontWeight: 500 }}>🌊 Flood risk</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: s.color, margin: 0 }}>{report.flood.riskLabel.split('—')[0].trim()}</p>
                    </div>
                  )
                })()}
                {/* EPC */}
                {report.epc?.found && report.epc.certificate && (() => {
                  const band = report.epc!.certificate!.currentBand
                  const col  = BAND_COLORS[band] ?? '#9e998f'
                  return (
                    <div style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 10, padding: '12px 14px' }}>
                      <p style={{ fontSize: 11, color: '#5e5a52', margin: '0 0 4px', fontWeight: 500 }}>⚡ EPC rating</p>
                      <p style={{ fontSize: 24, fontWeight: 700, color: col, margin: 0 }}>{band}</p>
                    </div>
                  )
                })()}
                {/* Crime */}
                {report.crime && !report.crime.message && (() => {
                  const r = crimeRating(report.crime.incidentsPerMonth)
                  return (
                    <div style={{ background: r.bg, border: `1px solid ${r.border}`, borderRadius: 10, padding: '12px 14px' }}>
                      <p style={{ fontSize: 11, color: r.color, margin: '0 0 4px', fontWeight: 500 }}>🚨 Crime</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: r.color, margin: 0 }}>{r.label} ({Math.round(report.crime.incidentsPerMonth)}/mo)</p>
                    </div>
                  )
                })()}
                {/* Broadband */}
                {report.broadband?.configured && report.broadband.maxDownloadMbps !== undefined && (() => {
                  const r = broadbandRating(report.broadband.maxDownloadMbps!)
                  return (
                    <div style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 10, padding: '12px 14px' }}>
                      <p style={{ fontSize: 11, color: '#5e5a52', margin: '0 0 4px', fontWeight: 500 }}>📡 Broadband</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: r.color, margin: 0 }}>{r.label}</p>
                    </div>
                  )
                })()}
                {/* Council Tax */}
                {report.councilTax && (
                  <div style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 10, padding: '12px 14px' }}>
                    <p style={{ fontSize: 11, color: '#5e5a52', margin: '0 0 4px', fontWeight: 500 }}>🏛️ Council tax</p>
                    {report.councilTax.actualBand ? (
                      <>
                        <p style={{ fontSize: 24, fontWeight: 700, color: '#1a1917', margin: '0 0 2px' }}>Band {report.councilTax.actualBand}</p>
                        {report.councilTax.actualAnnualRate && (
                          <p style={{ fontSize: 12, color: '#5e5a52', margin: 0 }}>~£{report.councilTax.actualAnnualRate.toLocaleString()}/yr</p>
                        )}
                      </>
                    ) : (
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1917', margin: 0 }}>Band D ~£{report.councilTax.avgBandDRate?.toLocaleString() ?? '—'}/yr</p>
                    )}
                  </div>
                )}
                {/* Planning */}
                {report.planning && (() => {
                  const hasRestriction = report.planning.listedBuilding || report.planning.inConservationArea || report.planning.articleFourDirection
                  const color = report.planning.listedBuilding ? '#9f1239' : hasRestriction ? '#451a03' : '#14532d'
                  const bg    = report.planning.listedBuilding ? '#fff1f2' : hasRestriction ? '#fffbeb' : '#f0fdf4'
                  const label = report.planning.listedBuilding
                    ? `Listed Bldg — Grade ${report.planning.listedBuildingGrade ?? 'II'}`
                    : report.planning.inConservationArea ? 'Conservation area'
                    : report.planning.articleFourDirection ? 'Article 4 Direction'
                    : 'No restrictions'
                  return (
                    <div style={{ background: bg, border: `1px solid ${color}40`, borderRadius: 10, padding: '12px 14px' }}>
                      <p style={{ fontSize: 11, color: '#5e5a52', margin: '0 0 4px', fontWeight: 500 }}>🏗️ Planning</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color, margin: '0 0 2px' }}>{label}</p>
                      <p style={{ fontSize: 11, color: '#5e5a52', margin: 0 }}>{report.planning.applicationsFound} app{report.planning.applicationsFound !== 1 ? 's' : ''} nearby</p>
                    </div>
                  )
                })()}
              </div>

              {/* ── 1. Flood Risk ── */}
              {report.flood && (() => {
                const s = RISK_STYLES[report.flood.riskLevel]
                return (
                  <div style={card} className="print-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <span style={{ fontSize: 24 }}>🌊</span>
                      <h3 style={sectionHead}>Flood Risk</h3>
                    </div>
                    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: s.color, margin: '0 0 6px' }}>{s.dot} {report.flood.riskLabel}</p>
                      <p style={{ fontSize: 13, color: s.color, margin: 0, lineHeight: 1.6 }}>{report.flood.description}</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                      {[
                        { label: 'Active warnings', value: report.flood.activeWarnings },
                        { label: 'Active alerts',   value: report.flood.activeAlerts },
                        { label: 'Nearby flood zones', value: report.flood.floodAreaCount },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background: '#f8f7f4', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                          <p style={{ fontSize: 22, fontWeight: 700, color: '#1a1917', margin: '0 0 2px' }}>{value}</p>
                          <p style={{ fontSize: 11, color: '#9e998f', margin: 0 }}>{label}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <a href={report.flood.checkUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}>
                        → Check EA flood map ↗
                      </a>
                      <a href={`https://www.gov.uk/check-long-term-flood-risk?postcode=${encodeURIComponent(report.postcode)}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}>
                        → Long-term flood risk ↗
                      </a>
                    </div>
                    <ChecklistItems items={[
                      { text: 'Check Environment Agency flood risk maps', done: true },
                      { text: 'Get specialist flood insurance quote if medium/high risk', done: report.flood.riskLevel === 'low' || report.flood.riskLevel === 'very-low' },
                    ]} />
                  </div>
                )
              })()}

              {/* ── 2. EPC ── */}
              {report.epc && (
                <div style={card} className="print-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 24 }}>⚡</span>
                    <h3 style={sectionHead}>Energy Performance (EPC)</h3>
                  </div>
                  {report.epc.found && report.epc.certificate ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'start', marginBottom: 16 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: 64, height: 64, borderRadius: 12, background: BAND_COLORS[report.epc.certificate.currentBand] ?? '#e2ddd6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                            {report.epc.certificate.currentBand}
                          </div>
                          <p style={{ fontSize: 11, color: '#9e998f', margin: 0 }}>Current</p>
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1917', margin: '0 0 6px' }}>{report.epc.certificate.address}</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[
                              { label: 'Current score',   value: `${report.epc.certificate.currentScore}/100` },
                              { label: 'Potential band',  value: `${report.epc.certificate.potentialBand} (${report.epc.certificate.potentialScore}/100)` },
                              { label: 'Property type',   value: report.epc.certificate.propertyType },
                              { label: 'Certificate age', value: `${report.epc.certificate.yearsOld} year${report.epc.certificate.yearsOld !== 1 ? 's' : ''} old` },
                              { label: 'Main fuel',       value: report.epc.certificate.mainFuel },
                              { label: 'Assessed',        value: report.epc.certificate.lodgementDate },
                            ].map(({ label, value }) => (
                              <div key={label}>
                                <p style={{ fontSize: 11, color: '#9e998f', margin: 0 }}>{label}</p>
                                <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1917', margin: 0 }}>{value}</p>
                              </div>
                            ))}
                          </div>
                          {report.epc.certificate.isStale && (
                            <div style={{ marginTop: 10, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 12px' }}>
                              <p style={{ fontSize: 12, color: '#451a03', margin: 0 }}>⚠ Certificate is over 10 years old — energy performance may have changed significantly.</p>
                            </div>
                          )}
                        </div>
                      </div>
                      {report.epc.upgradeRecommendations && report.epc.upgradeRecommendations.length > 0 && (
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9e998f', margin: '0 0 10px' }}>Recommended improvements</p>
                          {report.epc.upgradeRecommendations.slice(0, 4).map((rec, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < Math.min(3, report.epc!.upgradeRecommendations!.length - 1) ? '1px solid #f0ede8' : 'none', gap: 12 }}>
                              <p style={{ fontSize: 13, color: '#1a1917', margin: 0 }}>{rec.measure}</p>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <p style={{ fontSize: 12, color: '#14532d', fontWeight: 500, margin: 0 }}>Save {rec.saving}</p>
                                <p style={{ fontSize: 11, color: '#9e998f', margin: 0 }}>{rec.cost}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ background: '#f8f7f4', borderRadius: 10, padding: '16px', marginBottom: 12 }}>
                      <p style={{ fontSize: 13, color: '#5e5a52', margin: 0, lineHeight: 1.6 }}>
                        {report.epc?.message ?? 'EPC data not available. Try including the full address (e.g. "14 High Street") to improve matching.'}
                      </p>
                    </div>
                  )}
                  <ChecklistItems items={[
                    { text: 'Check EPC rating — minimum E required to let legally', done: report.epc.found },
                    { text: 'Review energy upgrade recommendations', done: !!(report.epc.upgradeRecommendations?.length) },
                  ]} />
                </div>
              )}

              {/* ── 3. Crime ── */}
              {report.crime && (() => {
                // Scotland (and any region without Police.uk data): show the message card
                if (report.crime.message) {
                  return (
                    <div style={card} className="print-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <span style={{ fontSize: 24 }}>🚨</span>
                        <h3 style={sectionHead}>Crime Statistics</h3>
                      </div>
                      <div style={{ background: '#f8f7f4', borderRadius: 10, padding: '16px', marginBottom: 12 }}>
                        <p style={{ fontSize: 13, color: '#5e5a52', margin: '0 0 8px', lineHeight: 1.6 }}>
                          {report.crime.message}
                        </p>
                        {report.crime.checkUrl && (
                          <a href={report.crime.checkUrl} target="_blank" rel="noreferrer"
                             style={{ fontSize: 13, color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}>
                            → Check your local police area ↗
                          </a>
                        )}
                      </div>
                    </div>
                  )
                }

                const r = crimeRating(report.crime.incidentsPerMonth)
                return (
                  <div style={card} className="print-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <span style={{ fontSize: 24 }}>🚨</span>
                      <h3 style={sectionHead}>Crime Statistics</h3>
                    </div>
                    <div style={{ background: r.bg, border: `1px solid ${r.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: r.color, margin: '0 0 4px' }}>
                        {r.label} crime rate — {Math.round(report.crime.incidentsPerMonth)} incidents/month
                      </p>
                      <p style={{ fontSize: 12, color: r.color, margin: 0 }}>
                        {report.crime.totalIncidents} total incidents over {report.crime.monthsAnalysed} months · Data to {report.crime.dataDate}
                      </p>
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9e998f', margin: '0 0 10px' }}>Top crime categories</p>
                    {report.crime.topCategories.slice(0, 6).map((cat, i) => {
                      const pct = Math.round((cat.count / report.crime!.totalIncidents) * 100)
                      return (
                        <div key={i} style={{ marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, color: '#1a1917' }}>{cat.category}</span>
                            <span style={{ fontSize: 12, color: '#9e998f' }}>{cat.count} ({pct}%)</span>
                          </div>
                          <div style={{ height: 4, background: '#f0ede8', borderRadius: 99 }}>
                            <div style={{ height: 4, width: `${pct}%`, background: '#1D9E75', borderRadius: 99 }} />
                          </div>
                        </div>
                      )
                    })}
                    <a href={`https://www.police.uk/pu/your-area/search/?postcode=${encodeURIComponent(report.postcode)}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#1D9E75', textDecoration: 'none', fontWeight: 500, display: 'block', marginTop: 12 }}>
                      → View full crime map on police.uk ↗
                    </a>
                    <ChecklistItems items={[
                      { text: 'Research crime statistics for the area', done: true },
                    ]} />
                  </div>
                )
              })()}

              {/* ── 4. Broadband ── */}
              {report.broadband && (
                <div style={card} className="print-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 24 }}>📡</span>
                    <h3 style={sectionHead}>Broadband &amp; Mobile</h3>
                  </div>
                  {report.broadband.configured && report.broadband.maxDownloadMbps !== undefined ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: 10, marginBottom: 16 }}>
                        {[
                          { label: 'Technology',      value: report.broadband.technologyType ?? '—' },
                          { label: 'Max download',    value: `${report.broadband.maxDownloadMbps} Mbps` },
                          { label: 'Max upload',      value: `${report.broadband.maxUploadMbps ?? '—'} Mbps` },
                          { label: 'Gigabit capable', value: report.broadband.gigabitCapable ? '✓ Yes' : '✗ No' },
                          { label: '4G coverage',     value: report.broadband.coverage4G ? '✓ Yes' : '✗ No' },
                          { label: '5G coverage',     value: report.broadband.coverage5G ? '✓ Yes' : '✗ No' },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ background: '#f8f7f4', borderRadius: 8, padding: '10px 12px' }}>
                            <p style={{ fontSize: 11, color: '#9e998f', margin: '0 0 2px' }}>{label}</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1917', margin: 0 }}>{value}</p>
                          </div>
                        ))}
                      </div>
                      {!report.broadband.superfast && (
                        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 12px' }}>
                          <p style={{ fontSize: 12, color: '#451a03', margin: 0 }}>⚠ Superfast broadband (30+ Mbps) is not available at this postcode. This may be a problem for remote working or streaming.</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ background: '#f8f7f4', borderRadius: 10, padding: '16px', marginBottom: 12 }}>
                      <p style={{ fontSize: 13, color: '#5e5a52', margin: '0 0 8px', lineHeight: 1.6 }}>
                        {report.broadband.message ?? 'Broadband data is not available. The Ofcom API key may not be configured.'}
                      </p>
                      {report.broadband.checkUrl && (
                        <a href={report.broadband.checkUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}>
                          → Check broadband on Ofcom ↗
                        </a>
                      )}
                    </div>
                  )}
                  <ChecklistItems items={[
                    { text: 'Check broadband speeds and technology type', done: !!(report.broadband.configured && report.broadband.maxDownloadMbps) },
                    { text: 'Verify 4G/5G mobile coverage', done: !!(report.broadband.configured && report.broadband.coverage4G !== undefined) },
                  ]} />
                </div>
              )}

              {/* ── 5. Council Tax ── */}
              {report.councilTax && (
                <div style={card} className="print-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 24 }}>🏛️</span>
                    <h3 style={sectionHead}>Council Tax</h3>
                  </div>

                  {/* Actual band — shown prominently when resolved */}
                  {report.councilTax.actualBand ? (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '16px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 12, background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                          {report.councilTax.actualBand}
                        </div>
                        <p style={{ fontSize: 11, color: '#14532d', margin: 0 }}>VOA Band</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#14532d', margin: '0 0 4px' }}>
                          ✓ Actual band confirmed for this property
                        </p>
                        <p style={{ fontSize: 13, color: '#14532d', margin: '0 0 4px' }}>
                          {report.councilTax.localAuthority}
                        </p>
                        {report.councilTax.actualAnnualRate && (
                          <p style={{ fontSize: 13, color: '#14532d', margin: 0 }}>
                            Estimated annual charge: ~£{report.councilTax.actualAnnualRate.toLocaleString()}/yr
                            <span style={{ fontSize: 11, color: '#166534', marginLeft: 6 }}>(based on regional Band D rate)</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#f8f7f4', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1917', margin: '0 0 4px' }}>{report.councilTax.localAuthority}</p>
                      {report.councilTax.avgBandDRate && (
                        <p style={{ fontSize: 13, color: '#5e5a52', margin: '0 0 4px' }}>Average Band D rate: ~£{report.councilTax.avgBandDRate.toLocaleString()}/year in this region</p>
                      )}
                      <p style={{ fontSize: 12, color: '#9e998f', margin: 0 }}>
                        {report.councilTax!.voaLookupUrl.includes('saa.gov.uk')
                          ? 'Scotland: band data is held by the SAA — use the link below to look up this property.'
                          : 'Band not resolved — enter a full address to get the exact band for this property.'}
                      </p>
                    </div>
                  )}

                  {/* Band rate grid */}
                  {report.councilTax.bandRates && (
                    <>
                      <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9e998f', margin: '0 0 10px' }}>
                        {report.councilTax.actualBand
                          ? 'All band rates — 2026-27 regional average'
                          : report.councilTax.voaLookupUrl.includes('saa.gov.uk')
                          ? 'Estimated band rates — 2025/26 council average'
                          : 'Estimated band rates — 2026-27 regional average'}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
                        {Object.entries(report.councilTax.bandRates).slice(0, 8).map(([band, rate]) => {
                          const isActual = band === report.councilTax!.actualBand
                          return (
                            <div key={band} style={{
                              background: isActual ? '#f0fdf4' : '#fff',
                              border: isActual ? '2px solid #1D9E75' : '1px solid #e2ddd6',
                              borderRadius: 8, padding: '10px', textAlign: 'center',
                            }}>
                              <p style={{ fontSize: 16, fontWeight: 700, color: isActual ? '#1D9E75' : '#1a1917', margin: '0 0 2px' }}>Band {band}</p>
                              <p style={{ fontSize: 12, color: '#5e5a52', margin: 0 }}>~£{Math.round(rate).toLocaleString()}/yr</p>
                              {isActual && <p style={{ fontSize: 10, color: '#1D9E75', margin: '3px 0 0', fontWeight: 600 }}>THIS PROPERTY</p>}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}

                  <p style={{ fontSize: 12, color: '#9e998f', margin: '0 0 10px', lineHeight: 1.5 }}>
                    {report.councilTax.actualBand
                      ? `Band ${report.councilTax.actualBand} confirmed from VOA data via Homedata. Annual cost uses 2026-27 regional average Band D — exact council rate may differ slightly.`
                      : report.councilTax.voaLookupUrl.includes('saa.gov.uk')
                      ? 'Rates shown are estimates based on 2025/26 council Band D averages. The exact band for this property is held by the SAA — use the link below to look it up.'
                      : 'Band rates are estimates based on 2026-27 regional averages (MHCLG). Rates vary between individual councils — check the exact band and annual amount for this specific address using the VOA link below.'}
                  </p>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <a href={report.councilTax.voaLookupUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}>
                      {report.councilTax.voaLookupUrl.includes('saa.gov.uk')
                        ? '→ Look up band on SAA ↗'
                        : '→ Check / challenge band on VOA ↗'}
                    </a>
                    <a href={report.councilTax.challengeGuideUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}>
                      → How to challenge your band ↗
                    </a>
                  </div>
                  {report.councilTax.appealDeadlineNote && (
                    <p style={{ fontSize: 11, color: '#9e998f', margin: '0 0 10px', lineHeight: 1.5 }}>
                      {report.councilTax.appealDeadlineNote}
                    </p>
                  )}
                  <ChecklistItems items={[
                    { text: 'Confirm council tax band and annual amount', done: !!report.councilTax.actualBand },
                  ]} />
                </div>
              )}

              {/* ── 6. Planning Applications ── */}
              {report.planning && (() => {
                const p = report.planning
                const hasRestriction = p.listedBuilding || p.inConservationArea || p.articleFourDirection
                const restrictionColor = p.listedBuilding ? '#9f1239' : hasRestriction ? '#451a03' : '#14532d'
                const restrictionBg    = p.listedBuilding ? '#fff1f2' : hasRestriction ? '#fffbeb' : '#f0fdf4'
                const restrictionBorder = p.listedBuilding ? '#fda4af' : hasRestriction ? '#fcd34d' : '#86efac'

                const DECISION_STYLES: Record<string, { color: string; bg: string; label: string }> = {
                  approved:  { color: '#14532d', bg: '#f0fdf4', label: 'Approved' },
                  refused:   { color: '#9f1239', bg: '#fff1f2', label: 'Refused'  },
                  withdrawn: { color: '#451a03', bg: '#fffbeb', label: 'Withdrawn'},
                  pending:   { color: '#1e40af', bg: '#eff6ff', label: 'Pending'  },
                  unknown:   { color: '#5e5a52', bg: '#f8f7f4', label: 'Unknown'  },
                }

                return (
                  <div style={card} className="print-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <span style={{ fontSize: 24 }}>🏗️</span>
                      <h3 style={sectionHead}>Planning Applications</h3>
                    </div>

                    {/* Restrictions banner */}
                    <div style={{ background: restrictionBg, border: `1px solid ${restrictionBorder}`, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                      {p.listedBuilding && (
                        <p style={{ fontSize: 14, fontWeight: 600, color: restrictionColor, margin: '0 0 4px' }}>
                          ⚠ Grade {p.listedBuildingGrade ?? 'II'} Listed Building — all alterations require Listed Building Consent
                        </p>
                      )}
                      {p.inConservationArea && (
                        <p style={{ fontSize: 14, fontWeight: 600, color: restrictionColor, margin: '0 0 4px' }}>
                          {p.listedBuilding ? '+ ' : '⚠ '}Conservation area{p.conservationAreaName ? ` — ${p.conservationAreaName}` : ''}
                        </p>
                      )}
                      {p.articleFourDirection && (
                        <p style={{ fontSize: 14, fontWeight: 600, color: restrictionColor, margin: '0 0 4px' }}>
                          {(p.listedBuilding || p.inConservationArea) ? '+ ' : '⚠ '}Article 4 Direction — permitted development rights removed
                          {p.articleFourDescription ? `: ${p.articleFourDescription}` : ''}
                        </p>
                      )}
                      {!hasRestriction && (
                        <p style={{ fontSize: 14, fontWeight: 600, color: restrictionColor, margin: 0 }}>
                          ✓ No conservation area, listed building, or Article 4 Direction
                        </p>
                      )}
                      <p style={{ fontSize: 12, color: restrictionColor, margin: hasRestriction ? '6px 0 0' : '0', opacity: 0.8 }}>
                        Local planning authority: {p.lpaName}
                      </p>
                    </div>

                    {/* Applications on this property */}
                    {p.propertyApplications.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#9e998f', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>
                          Applications on this property (last 5 years)
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {p.propertyApplications.map((app, i) => {
                            const ds = DECISION_STYLES[app.decisionType]
                            return (
                              <div key={i} style={{ background: '#f8f7f4', border: '1px solid #e2ddd6', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                <span style={{ fontSize: 11, fontWeight: 600, background: ds.bg, color: ds.color, border: `1px solid ${ds.color}40`, borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 1 }}>
                                  {ds.label}
                                </span>
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontSize: 13, color: '#1a1917', margin: '0 0 2px', lineHeight: 1.5 }}>{app.description}</p>
                                  <p style={{ fontSize: 11, color: '#9e998f', margin: 0 }}>
                                    Ref: {app.reference}{app.date ? ` · ${app.date}` : ''}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Nearby applications */}
                    {p.nearbyApplications.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#9e998f', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>
                          Nearby applications within 500 m (last 5 years)
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {p.nearbyApplications.map((app, i) => {
                            const ds = DECISION_STYLES[app.decisionType]
                            return (
                              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0', borderBottom: i < p.nearbyApplications.length - 1 ? '1px solid #f0ede8' : 'none' }}>
                                <span style={{ fontSize: 11, fontWeight: 600, background: ds.bg, color: ds.color, border: `1px solid ${ds.color}40`, borderRadius: 20, padding: '1px 7px', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 1 }}>
                                  {ds.label}
                                </span>
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontSize: 12, color: '#1a1917', margin: '0 0 1px', lineHeight: 1.5 }}>{app.description.slice(0, 120)}{app.description.length > 120 ? '…' : ''}</p>
                                  <p style={{ fontSize: 11, color: '#9e998f', margin: 0 }}>
                                    {app.date ? app.date : 'Date unknown'}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {p.applicationsFound === 0 && (
                      <p style={{ fontSize: 13, color: '#5e5a52', margin: '0 0 14px', lineHeight: 1.6 }}>
                        No planning applications found via the national dataset for this location. Coverage is limited to councils in the Open Digital Planning pilot (~30 LPAs) — verify directly on the {p.lpaName} portal.
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <a href={p.lpaApplicationsUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}>
                        → View on {p.lpaName} planning portal ↗
                      </a>
                    </div>

                    <ChecklistItems items={[
                      { text: 'Check for conservation area or listed building restrictions', done: true },
                      { text: 'Review any refused or pending applications on this property', done: p.propertyApplications.filter(a => a.decisionType === 'refused' || a.decisionType === 'pending').length === 0 },
                      { text: 'Check nearby development applications', done: p.nearbyApplications.length === 0 },
                    ]} />
                  </div>
                )
              })()}

              {/* ── Premium Professional Services ── */}
              <PremiumServices postcode={report.postcode} address={report.address} />

              {/* Remaining self-check items */}
              <div style={{ ...card, background: '#f8f7f4', border: '1px solid #e2ddd6' }} className="print-card">
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1917', margin: '0 0 10px' }}>📋 Other checks to do yourself</p>
                <p style={{ fontSize: 12, color: '#5e5a52', margin: '0 0 12px', lineHeight: 1.6 }}>
                  These items require a physical visit or further research — no professional needed:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 6 }}>
                  {[
                    '🪟 Check for damp, mould & window seals during viewing',
                    '📋 Review lease terms if leasehold (ask your solicitor)',
                    '🏘️ Visit the neighbourhood at different times of day',
                    '🤝 Research comparable sold prices on Rightmove',
                  ].map(item => (
                    <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 12, color: '#5e5a52', lineHeight: 1.6 }}>{item}</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: '#9e998f', margin: '14px 0 0', lineHeight: 1.5 }}>
                  Use our <Link href="/tools/checklist" style={{ color: '#1D9E75' }}>full property buying checklist</Link> to track every step of your purchase.
                </p>
              </div>

              {/* Disclaimer */}
              <p style={{ fontSize: 11, color: '#9e998f', marginTop: 16, lineHeight: 1.6 }}>
                This report uses publicly available data sources (Environment Agency, MHCLG, Police.uk, Ofcom, postcodes.io). It is provided for information only and does not constitute professional advice. Always instruct a qualified surveyor, solicitor, and financial adviser before exchanging contracts.
              </p>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </>
    </RequireAuth>
  )
}

// ─── Premium Services component ───────────────────────────────────────────────

interface PremiumService {
  icon:        string
  title:       string
  subtitle:    string
  description: string
  includes:    string[]
  typicalCost: string
  timeline:    string
  why:         string
}

const PREMIUM_SERVICES: PremiumService[] = [
  {
    icon:        '⚖️',
    title:       'Title Register & Legal Checks',
    subtitle:    'Conveyancing solicitor review',
    description: 'A PropHealth-vetted conveyancing solicitor reviews the official title register, checks for restrictive covenants, boundary disputes, planning enforcement notices, and any charges or restrictions on the property.',
    includes:    [
      'Official title register & title plan (HMLR)',
      'Restrictive covenants & easements review',
      'Local Authority & drainage searches',
      'Planning & building regulations check',
      'Boundary & rights of way verification',
      'Written legal summary report',
    ],
    typicalCost: '£800 – £1,500',
    timeline:    '5–10 working days',
    why:         'Legal issues are the most common cause of aborted purchases. Catching a covenant or boundary problem early saves thousands.',
  },
  {
    icon:        '🏗️',
    title:       'Structural Survey',
    subtitle:    'RICS Level 2 or Level 3',
    description: 'A RICS-accredited surveyor carries out a full inspection of the property — roof, walls, foundations, drainage, electrics, and more. You receive a detailed written report with condition ratings and cost estimates for any defects found.',
    includes:    [
      'Full inspection of roof, walls & foundations',
      'Damp, mould & timber condition assessment',
      'Boiler, heating & plumbing overview',
      'Electrical consumer unit check',
      'Loft, drainage & external inspection',
      'Condition ratings (1–3) with cost estimates',
    ],
    typicalCost: '£500 – £1,500',
    timeline:    '3–5 working days after inspection',
    why:         'A £600 survey can save you from buying a property with £30,000 of hidden defects. Never rely on the mortgage lender\'s valuation alone.',
  },
  {
    icon:        '🔥',
    title:       'Gas Safety Certificate',
    subtitle:    'CP12 — Gas Safe registered engineer',
    description: 'A Gas Safe registered engineer inspects and tests all gas appliances, pipework, and the boiler at the property. You receive a CP12 certificate — legally required for lettings and essential for any purchase with gas.',
    includes:    [
      'Boiler inspection & flue test',
      'All gas appliances checked & tested',
      'Gas pipework pressure test',
      'Carbon monoxide risk assessment',
      'CP12 certificate issued on the day',
      'Written defect report if issues found',
    ],
    typicalCost: '£60 – £120',
    timeline:    'Same day or next day',
    why:         'Faulty gas appliances cause over 40 deaths a year in the UK. A CP12 confirms the property is safe and is required annually for lettings.',
  },
  {
    icon:        '⚡',
    title:       'EICR Electrical Report',
    subtitle:    'Electrical Installation Condition Report',
    description: 'A qualified electrician carries out a full Electrical Installation Condition Report (EICR) on the property\'s wiring, consumer unit, sockets, and fixed appliances. Essential for any purchase — mandatory for all rented properties.',
    includes:    [
      'Full inspection of consumer unit (fuse box)',
      'Wiring condition & earthing check',
      'All sockets, switches & lighting tested',
      'RCD protection verification',
      'Code C1/C2/C3 defect classification',
      'EICR certificate valid for 5 years',
    ],
    typicalCost: '£150 – £300',
    timeline:    '1–2 working days',
    why:         'EICRs are mandatory for all rented properties and strongly advised for any purchase. Old wiring is a leading cause of house fires.',
  },
]

function PremiumServices({ postcode, address }: { postcode: string; address: string }) {
  const params = [
    postcode && `postcode=${encodeURIComponent(postcode)}`,
    address  && `address=${encodeURIComponent(address)}`,
  ].filter(Boolean).join('&')
  const enquiryBase = `/pricing/professional${params ? `?${params}` : ''}`

  return (
    <div style={{ marginBottom: 16 }} className="print-card">
      {/* Section header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1917 0%, #2d2b28 100%)',
        borderRadius: '14px 14px 0 0',
        padding: '20px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f59e0b' }}>PropHealth Premium</span>
            <span style={{ fontSize: 11, background: '#f59e0b', color: '#1a1917', borderRadius: 20, padding: '1px 8px', fontWeight: 700 }}>Add-on services</span>
          </div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: '#fff', margin: 0 }}>
            Professional checks for this property
          </p>
        </div>
        <Link href={enquiryBase} style={{ height: 38, padding: '0 16px', fontSize: 13, fontWeight: 600, background: '#f59e0b', color: '#1a1917', borderRadius: 8, textDecoration: 'none', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
          View services →
        </Link>
      </div>

      {/* Service cards */}
      <div style={{ background: '#fff', border: '1px solid #e2ddd6', borderTop: 'none', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
        {PREMIUM_SERVICES.map((svc, idx) => (
          <div key={svc.title} style={{
            padding: '22px 24px',
            borderBottom: idx < PREMIUM_SERVICES.length - 1 ? '1px solid #f0ede8' : 'none',
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '16px 24px',
            alignItems: 'start',
          }}>
            {/* Left: content */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 22 }}>{svc.icon}</span>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1917', margin: 0 }}>{svc.title}</p>
                  <p style={{ fontSize: 12, color: '#9e998f', margin: 0 }}>{svc.subtitle}</p>
                </div>
                <span style={{ fontSize: 11, background: '#fef9c3', color: '#713f12', border: '1px solid #fcd34d', borderRadius: 20, padding: '1px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  🔒 Premium
                </span>
              </div>

              <p style={{ fontSize: 13, color: '#5e5a52', lineHeight: 1.6, margin: '0 0 12px' }}>{svc.description}</p>

              {/* Includes list */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: '4px 12px', marginBottom: 12 }}>
                {svc.includes.map(item => (
                  <div key={item} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <span style={{ color: '#1D9E75', fontSize: 12, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 12, color: '#5e5a52', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>

              {/* Why this matters */}
              <div style={{ background: '#f8f7f4', borderRadius: 8, padding: '8px 12px' }}>
                <p style={{ fontSize: 12, color: '#5e5a52', margin: 0, lineHeight: 1.5 }}>
                  <strong style={{ color: '#1a1917' }}>Why it matters: </strong>{svc.why}
                </p>
              </div>
            </div>

            {/* Right: price + CTA */}
            <div style={{ textAlign: 'center', minWidth: 140 }}>
              <div style={{ background: '#f8f7f4', border: '1px solid #e2ddd6', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
                <p style={{ fontSize: 11, color: '#9e998f', margin: '0 0 2px' }}>Typical cost</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1917', margin: '0 0 4px' }}>{svc.typicalCost}</p>
                <p style={{ fontSize: 11, color: '#9e998f', margin: 0 }}>⏱ {svc.timeline}</p>
              </div>
              <Link
                href={`${enquiryBase}${enquiryBase.includes('?') ? '&' : '?'}service=${encodeURIComponent(svc.title)}`}
                style={{
                  display: 'block', width: '100%', padding: '10px 0', fontSize: 13, fontWeight: 600,
                  background: '#1D9E75', color: '#fff', borderRadius: 8, textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                Get a quote →
              </Link>
              <p style={{ fontSize: 11, color: '#9e998f', margin: '6px 0 0' }}>PropHealth-vetted professionals</p>
            </div>
          </div>
        ))}

        {/* Footer CTA */}
        <div style={{ background: '#f8f7f4', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 13, color: '#5e5a52', margin: 0 }}>
            Get all four professional checks bundled — and save vs. booking separately.
          </p>
          <Link href={enquiryBase} style={{ height: 36, padding: '0 16px', fontSize: 13, fontWeight: 600, background: '#1a1917', color: '#fff', borderRadius: 8, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            See all services →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Checklist items component ────────────────────────────────────────────────

function ChecklistItems({ items }: { items: { text: string; done: boolean }[] }) {
  return (
    <div style={{ marginTop: 14, borderTop: '1px solid #f0ede8', paddingTop: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9e998f', margin: '0 0 8px' }}>Checklist status</p>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 4 }}>
          <span style={{ fontSize: 14, flexShrink: 0, color: item.done ? '#1D9E75' : '#9e998f' }}>{item.done ? '✓' : '○'}</span>
          <p style={{ fontSize: 12, color: item.done ? '#14532d' : '#5e5a52', margin: 0, lineHeight: 1.5 }}>{item.text}</p>
        </div>
      ))}
    </div>
  )
}