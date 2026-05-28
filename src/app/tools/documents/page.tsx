'use client'

import { useState, useRef } from 'react'
import { SiteNav } from '../../components/SiteNav'
import { Footer } from '../../components/Footer'
import { RequireAuth } from '../../components/RequireAuth'

// ── Types ─────────────────────────────────────────────────────────────────────

type DocTypeName = 'epc' | 'property_report' | 'survey' | 'legal' | 'other'
type Tab = 'register' | 'verify'

interface RegisterResult {
  success:         boolean
  fileName:        string
  docType:         string
  postcode:        string | null
  fileHash:        string
  txHash:          string
  blockNumber:     number
  polygonscanUrl:  string
  contractAddress: string
  gasUsed:         string
  registeredAt:    string
  network:         string
}

interface VerifyResult {
  registered:     boolean
  fileHash:       string
  docType?:       string
  postcode?:      string
  fileName?:      string
  registeredBy?:  string
  registeredAt?:  string
  polygonscanUrl?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DOC_TYPE_OPTIONS: { value: DocTypeName; label: string }[] = [
  { value: 'epc',             label: 'EPC Certificate'  },
  { value: 'property_report', label: 'Property Report'  },
  { value: 'survey',          label: 'Survey'           },
  { value: 'legal',           label: 'Legal Document'   },
  { value: 'other',           label: 'Other'            },
]

function truncate(s: string, len = 20) {
  return s.length > len ? `${s.slice(0, 8)}…${s.slice(-6)}` : s
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [tab, setTab] = useState<Tab>('register')

  // Register state
  const [regFile,     setRegFile]     = useState<File | null>(null)
  const [docType,     setDocType]     = useState<DocTypeName>('other')
  const [postcode,    setPostcode]    = useState('')
  const [regLoading,  setRegLoading]  = useState(false)
  const [regResult,   setRegResult]   = useState<RegisterResult | null>(null)
  const [regError,    setRegError]    = useState('')

  // Verify state
  const [verFile,     setVerFile]     = useState<File | null>(null)
  const [verLoading,  setVerLoading]  = useState(false)
  const [verResult,   setVerResult]   = useState<VerifyResult | null>(null)
  const [verError,    setVerError]    = useState('')

  const regInputRef = useRef<HTMLInputElement>(null)
  const verInputRef = useRef<HTMLInputElement>(null)

  // ── Register ────────────────────────────────────────────────────────────────

  const handleRegister = async () => {
    if (!regFile) return
    setRegLoading(true)
    setRegResult(null)
    setRegError('')
    try {
      const fd = new FormData()
      fd.append('file',     regFile)
      fd.append('docType',  docType)
      fd.append('postcode', postcode.trim())
      const res  = await fetch('/api/blockchain/register', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setRegResult(data as RegisterResult)
    } catch (e) {
      setRegError(e instanceof Error ? e.message : 'Registration failed')
    } finally {
      setRegLoading(false)
    }
  }

  // ── Verify ──────────────────────────────────────────────────────────────────

  const handleVerify = async () => {
    if (!verFile) return
    setVerLoading(true)
    setVerResult(null)
    setVerError('')
    try {
      const fd = new FormData()
      fd.append('file', verFile)
      const res  = await fetch('/api/blockchain/verify', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setVerResult(data as VerifyResult)
    } catch (e) {
      setVerError(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setVerLoading(false)
    }
  }

  // ── Styles ───────────────────────────────────────────────────────────────────

  const card:  React.CSSProperties = { background: '#fff', border: '1px solid #e2ddd6', borderRadius: 14, padding: 28, marginBottom: 16 }
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#5e5a52', display: 'block', marginBottom: 6 }
  const input: React.CSSProperties = { width: '100%', height: 46, padding: '0 14px', fontSize: 15, border: '1.5px solid #e2ddd6', borderRadius: 10, background: '#fff', color: '#1a1917', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }
  const btn  = (disabled: boolean, variant: 'primary' | 'secondary' = 'primary'): React.CSSProperties => ({
    height: 46, padding: '0 22px', fontSize: 14, fontWeight: 500, border: 'none', borderRadius: 10,
    cursor: disabled ? 'default' : 'pointer', fontFamily: 'var(--font-body)',
    background: disabled ? '#9e998f' : variant === 'primary' ? '#1D9E75' : '#1a1917',
    color: '#fff', transition: 'background 0.2s', opacity: disabled ? 0.7 : 1,
  })

  const dropZone = (active: boolean): React.CSSProperties => ({
    border: `2px dashed ${active ? '#1D9E75' : '#e2ddd6'}`, borderRadius: 12,
    padding: '32px 24px', textAlign: 'center', cursor: 'pointer',
    background: active ? '#f0fdf4' : '#f8f7f4', transition: 'all 0.2s', marginBottom: 16,
  })

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <RequireAuth requirePlan toolName="Document Vault">
    <>
      <div style={{ minHeight: '100vh', background: '#f8f7f4', display: 'flex', flexDirection: 'column' }}>
        <SiteNav />

        <main style={{ maxWidth: 720, margin: '0 auto', width: '100%', flex: 1, padding: 'clamp(32px,5vw,48px) clamp(16px,4vw,40px) 80px' }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9e998f', display: 'block', marginBottom: 8 }}>Blockchain</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,3vw,34px)', fontWeight: 500, color: '#1a1917', margin: '0 0 12px' }}>Document Registry</h1>
            <p style={{ fontSize: 15, color: '#5e5a52', lineHeight: 1.7, margin: 0 }}>
              Register property documents on the Polygon blockchain for a permanent, tamper-proof audit trail.
              A SHA-256 hash of each document is stored on-chain — the original file stays private.
            </p>
          </div>

          {/* How it works */}
          <div style={{ ...card, background: '#f0fdf4', border: '1px solid #86efac', marginBottom: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#14532d', margin: '0 0 10px' }}>⛓️ How it works</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 12 }}>
              {[
                ['1. Upload',  'You select a document — it never leaves your browser unencrypted.'],
                ['2. Hash',    'A SHA-256 fingerprint of the file is computed server-side.'],
                ['3. On-chain','The hash is written to a smart contract on Polygon (gas ~$0.001).'],
                ['4. Verify',  'Anyone can verify a document\'s authenticity by re-uploading it.'],
              ].map(([step, desc]) => (
                <div key={step}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#166534', margin: '0 0 4px' }}>{step}</p>
                  <p style={{ fontSize: 12, color: '#14532d', margin: 0, lineHeight: 1.5 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {(['register', 'verify'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                height: 40, padding: '0 20px', fontSize: 14, fontWeight: 500, borderRadius: 10,
                border: tab === t ? 'none' : '1.5px solid #e2ddd6',
                background: tab === t ? '#1a1917' : '#fff', color: tab === t ? '#fff' : '#5e5a52',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}>
                {t === 'register' ? '📝 Register document' : '🔍 Verify document'}
              </button>
            ))}
          </div>

          {/* ── REGISTER TAB ── */}
          {tab === 'register' && (
            <div style={card}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, color: '#1a1917', margin: '0 0 20px' }}>
                Register a document
              </h2>

              {/* Drop zone */}
              <div style={dropZone(!!regFile)} onClick={() => regInputRef.current?.click()}>
                <input ref={regInputRef} type="file" style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                  onChange={e => setRegFile(e.target.files?.[0] ?? null)} />
                {regFile ? (
                  <>
                    <p style={{ fontSize: 28, margin: '0 0 6px' }}>📄</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1917', margin: '0 0 4px' }}>{regFile.name}</p>
                    <p style={{ fontSize: 12, color: '#9e998f', margin: 0 }}>{(regFile.size / 1024).toFixed(1)} KB — click to change</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 32, margin: '0 0 8px' }}>📁</p>
                    <p style={{ fontSize: 14, color: '#5e5a52', margin: '0 0 4px' }}>Click to select a document</p>
                    <p style={{ fontSize: 12, color: '#9e998f', margin: 0 }}>PDF, Word, images — max 20 MB</p>
                  </>
                )}
              </div>

              {/* Metadata */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                <div>
                  <label style={label}>Document type</label>
                  <select value={docType} onChange={e => setDocType(e.target.value as DocTypeName)}
                    style={{ ...input, cursor: 'pointer', paddingRight: 32 }}>
                    {DOC_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Property postcode (optional)</label>
                  <input value={postcode} onChange={e => setPostcode(e.target.value)}
                    placeholder="e.g. SW1A 1AA" style={input} />
                </div>
              </div>

              <button onClick={handleRegister} disabled={!regFile || regLoading}
                style={btn(!regFile || regLoading)}>
                {regLoading ? '⏳ Registering on Polygon…' : '⛓️ Register on blockchain'}
              </button>

              {/* Error */}
              {regError && (
                <div style={{ marginTop: 14, background: '#fff1f2', border: '1px solid #fda4af', borderRadius: 10, padding: '12px 16px' }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#9f1239', margin: '0 0 4px' }}>Registration failed</p>
                  <p style={{ fontSize: 13, color: '#9f1239', margin: 0 }}>{regError}</p>
                  {regError.includes('not configured') && (
                    <p style={{ fontSize: 12, color: '#9f1239', margin: '6px 0 0' }}>
                      See the <a href="#setup" style={{ color: '#9f1239' }}>setup guide below</a> to configure your Polygon credentials.
                    </p>
                  )}
                </div>
              )}

              {/* Success */}
              {regResult && (
                <div style={{ marginTop: 14, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '16px 18px' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#14532d', margin: '0 0 12px' }}>
                    ✅ Document registered on Polygon
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'File',        value: regResult.fileName },
                      { label: 'Type',        value: regResult.docType },
                      { label: 'Postcode',    value: regResult.postcode ?? '—' },
                      { label: 'Network',     value: regResult.network },
                      { label: 'Block',       value: `#${regResult.blockNumber.toLocaleString()}` },
                      { label: 'Gas used',    value: Number(regResult.gasUsed).toLocaleString() },
                      { label: 'Registered',  value: new Date(regResult.registeredAt).toLocaleString('en-GB') },
                    ].map(({ label: l, value: v }) => (
                      <div key={l}>
                        <p style={{ fontSize: 11, color: '#9e998f', margin: 0 }}>{l}</p>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1917', margin: 0 }}>{v}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, padding: '10px 12px', background: '#fff', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, color: '#1a1917', wordBreak: 'break-all' }}>
                    <p style={{ fontWeight: 600, margin: '0 0 4px', fontFamily: 'var(--font-body)', fontSize: 11, color: '#9e998f' }}>SHA-256 hash</p>
                    {regResult.fileHash}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <a href={regResult.polygonscanUrl} target="_blank" rel="noreferrer"
                      style={{ fontSize: 13, fontWeight: 500, color: '#1D9E75', textDecoration: 'none' }}>
                      → View transaction on Polygonscan ↗
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── VERIFY TAB ── */}
          {tab === 'verify' && (
            <div style={card}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, color: '#1a1917', margin: '0 0 8px' }}>
                Verify a document
              </h2>
              <p style={{ fontSize: 13, color: '#5e5a52', margin: '0 0 20px', lineHeight: 1.6 }}>
                Upload the original file to check whether it has been registered on-chain and hasn't been altered since registration.
              </p>

              <div style={dropZone(!!verFile)} onClick={() => verInputRef.current?.click()}>
                <input ref={verInputRef} type="file" style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                  onChange={e => setVerFile(e.target.files?.[0] ?? null)} />
                {verFile ? (
                  <>
                    <p style={{ fontSize: 28, margin: '0 0 6px' }}>📄</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1917', margin: '0 0 4px' }}>{verFile.name}</p>
                    <p style={{ fontSize: 12, color: '#9e998f', margin: 0 }}>{(verFile.size / 1024).toFixed(1)} KB — click to change</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 32, margin: '0 0 8px' }}>🔍</p>
                    <p style={{ fontSize: 14, color: '#5e5a52', margin: '0 0 4px' }}>Upload the document to verify</p>
                    <p style={{ fontSize: 12, color: '#9e998f', margin: 0 }}>The file is hashed locally — only the hash is sent</p>
                  </>
                )}
              </div>

              <button onClick={handleVerify} disabled={!verFile || verLoading}
                style={btn(!verFile || verLoading)}>
                {verLoading ? '⏳ Checking blockchain…' : '🔍 Verify on blockchain'}
              </button>

              {verError && (
                <div style={{ marginTop: 14, background: '#fff1f2', border: '1px solid #fda4af', borderRadius: 10, padding: '12px 16px' }}>
                  <p style={{ fontSize: 13, color: '#9f1239', margin: 0 }}>{verError}</p>
                </div>
              )}

              {verResult && (
                <div style={{
                  marginTop: 14, borderRadius: 10, padding: '16px 18px',
                  background: verResult.registered ? '#f0fdf4' : '#fff1f2',
                  border: `1px solid ${verResult.registered ? '#86efac' : '#fda4af'}`,
                }}>
                  {verResult.registered ? (
                    <>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#14532d', margin: '0 0 12px' }}>
                        ✅ Document verified — registered on Polygon
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[
                          { label: 'File name',     value: verResult.fileName ?? '—' },
                          { label: 'Type',          value: verResult.docType  ?? '—' },
                          { label: 'Postcode',      value: verResult.postcode ?? '—' },
                          { label: 'Registered at', value: verResult.registeredAt ? new Date(verResult.registeredAt).toLocaleString('en-GB') : '—' },
                          { label: 'Registered by', value: verResult.registeredBy ? truncate(verResult.registeredBy, 18) : '—' },
                        ].map(({ label: l, value: v }) => (
                          <div key={l}>
                            <p style={{ fontSize: 11, color: '#9e998f', margin: 0 }}>{l}</p>
                            <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1917', margin: 0 }}>{v}</p>
                          </div>
                        ))}
                      </div>
                      {verResult.polygonscanUrl && (
                        <div style={{ marginTop: 12 }}>
                          <a href={verResult.polygonscanUrl} target="_blank" rel="noreferrer"
                            style={{ fontSize: 13, fontWeight: 500, color: '#1D9E75', textDecoration: 'none' }}>
                            → View on Polygonscan ↗
                          </a>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#9f1239', margin: '0 0 6px' }}>
                        ❌ Not registered — document not found on blockchain
                      </p>
                      <p style={{ fontSize: 13, color: '#9f1239', margin: '0 0 8px', lineHeight: 1.5 }}>
                        This document has not been registered, or it has been modified since registration (even a single changed byte will produce a different hash).
                      </p>
                      <div style={{ padding: '8px 12px', background: '#fff', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, color: '#9f1239', wordBreak: 'break-all' }}>
                        {verResult.fileHash}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Setup guide ── */}
          <div id="setup" style={{ ...card, background: '#f8f7f4' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1917', margin: '0 0 14px' }}>🔧 Setup guide</p>
            <p style={{ fontSize: 13, color: '#5e5a52', margin: '0 0 14px', lineHeight: 1.6 }}>
              Add these four variables to your <code style={{ background: '#e8e4df', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>.env.local</code>:
            </p>
            <div style={{ background: '#1a1917', borderRadius: 10, padding: '16px 18px', fontFamily: 'monospace', fontSize: 12, color: '#d4cfca', lineHeight: 1.8 }}>
              <span style={{ color: '#9e998f' }}># 1. Get a free Polygon Amoy RPC at alchemy.com</span><br />
              POLYGON_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY<br />
              POLYGON_NETWORK=amoy<br /><br />
              <span style={{ color: '#9e998f' }}># 2. A new wallet just for signing — fund with test MATIC at faucet.polygon.technology</span><br />
              BLOCKCHAIN_WALLET_KEY=0x...<br /><br />
              <span style={{ color: '#9e998f' }}># 3. Deploy DocumentRegistry.sol (see contracts/ folder), paste address here</span><br />
              DOCUMENT_REGISTRY_ADDR=0x...<br /><br />
              <span style={{ color: '#9e998f' }}># 4. Optional: Vercel Blob for file storage in production</span><br />
              BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <a href="https://alchemy.com" target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#1D9E75', fontWeight: 500, textDecoration: 'none' }}>→ Get Alchemy RPC ↗</a>
              <a href="https://faucet.polygon.technology" target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#1D9E75', fontWeight: 500, textDecoration: 'none' }}>→ Polygon Amoy faucet ↗</a>
              <a href="https://remix.ethereum.org" target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#1D9E75', fontWeight: 500, textDecoration: 'none' }}>→ Deploy contract on Remix ↗</a>
            </div>
          </div>

        </main>
        <Footer />
      </div>
    </>
    </RequireAuth>
  )
}
