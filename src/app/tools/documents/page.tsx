'use client'

import { useState, useEffect, useRef } from 'react'
import { SiteNav } from '../../components/SiteNav'
import { Footer } from '../../components/Footer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoredDocument {
  id:         string
  name:       string
  category:   string
  uploadedAt: string
  sizeBytes:  number
  dataUrl:    string    // base64 data URL stored in localStorage
  notes:      string
}

const CATEGORIES = [
  'All', 'Survey', 'EPC', 'Gas Safety', 'Planning', 'Legal', 'Insurance', 'Mortgage', 'Other',
]

const CATEGORY_ICONS: Record<string, string> = {
  'Survey': '🏠', 'EPC': '⚡', 'Gas Safety': '🔥', 'Planning': '📋',
  'Legal': '⚖️', 'Insurance': '🛡️', 'Mortgage': '🏦', 'Other': '📄',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const STORAGE_KEY = 'proppilot-documents'

// ─── Component ────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [docs,      setDocs]      = useState<StoredDocument[]>([])
  const [filter,    setFilter]    = useState('All')
  const [dragging,  setDragging]  = useState(false)
  const [uploading, setUploading] = useState(false)
  const [category,  setCategory]  = useState('Other')
  const fileInputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setDocs(JSON.parse(saved))
    } catch {}
  }, [])

  const save2 = (updater: StoredDocument[] | ((prev: StoredDocument[]) => StoredDocument[])) => {
    setDocs(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  const handleFiles = async (files: FileList | null, cat: string) => {
    if (!files || files.length === 0) return
    setUploading(true)
    for (const file of Array.from(files)) {
      await new Promise<void>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          const doc: StoredDocument = {
            id: crypto.randomUUID(), name: file.name, category: cat,
            uploadedAt: new Date().toISOString(), sizeBytes: file.size,
            dataUrl: reader.result as string, notes: '',
          }
          save2((prev: StoredDocument[]) => [...prev, doc])
          resolve()
        }
        reader.readAsDataURL(file)
      })
    }
    setUploading(false)
  }

  const deleteDoc = (id: string) => save2((prev: StoredDocument[]) => prev.filter(d => d.id !== id))

  const downloadDoc = (doc: StoredDocument) => {
    const a = document.createElement('a')
    a.href = doc.dataUrl
    a.download = doc.name
    a.click()
  }

  const filtered   = filter === 'All' ? docs : docs.filter(d => d.category === filter)
  const totalSize  = docs.reduce((sum, d) => sum + d.sizeBytes, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4' }}>
      <SiteNav />

      <main style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(32px,5vw,48px) clamp(16px,4vw,40px) 80px' }}>
        <div style={{ marginBottom: 28 }}>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9e998f', display: 'block', marginBottom: 8 }}>Home documents</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,3vw,36px)', fontWeight: 500, color: '#1a1917', margin: '0 0 6px' }}>Document Vault</h1>
          <p style={{ fontSize: 14, color: '#5e5a52', margin: 0 }}>
            {docs.length} document{docs.length !== 1 ? 's' : ''} · {formatBytes(totalSize)} used · Stored in your browser
          </p>
        </div>

        {/* Upload zone */}
        <div
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files, category) }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? '#1D9E75' : '#e2ddd6'}`,
            borderRadius: 16, padding: '36px 24px',
            textAlign: 'center', cursor: 'pointer',
            background: dragging ? '#f0fdf4' : '#fff',
            marginBottom: 16, transition: 'all 0.15s',
          }}
        >
          <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files, category)} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
          <p style={{ fontSize: 24, margin: '0 0 8px' }}>📁</p>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1917', margin: '0 0 4px' }}>
            {uploading ? 'Uploading…' : 'Drop files here or click to upload'}
          </p>
          <p style={{ fontSize: 12, color: '#9e998f', margin: 0 }}>PDF, Word, JPG, PNG · Max 10 MB each</p>
        </div>

        {/* Category picker for upload */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#5e5a52', flexShrink: 0 }}>Upload category:</span>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ height: 34, padding: '0 10px', fontSize: 13, border: '1.5px solid #e2ddd6', borderRadius: 8, background: '#fff', color: '#1a1917', fontFamily: 'var(--font-body)', outline: 'none' }}>
            {CATEGORIES.slice(1).map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{ height: 30, padding: '0 12px', fontSize: 12, fontWeight: 500, background: filter === cat ? '#1D9E75' : '#fff', color: filter === cat ? '#fff' : '#5e5a52', border: `1px solid ${filter === cat ? '#1D9E75' : '#e2ddd6'}`, borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              {cat} {cat !== 'All' && docs.filter(d => d.category === cat).length > 0 ? `(${docs.filter(d => d.category === cat).length})` : ''}
            </button>
          ))}
        </div>

        {/* Document list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9e998f', background: '#fff', borderRadius: 12, border: '1px solid #e2ddd6' }}>
            <p style={{ fontSize: 14, margin: 0 }}>No documents yet. Drop your files above to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(doc => (
              <div key={doc.id} style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 12, padding: '16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {CATEGORY_ICONS[doc.category] ?? '📄'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1917', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, background: '#f8f7f4', color: '#9e998f', borderRadius: 20, padding: '1px 8px', border: '1px solid #e2ddd6' }}>{doc.category}</span>
                    <span style={{ fontSize: 11, color: '#9e998f' }}>{formatBytes(doc.sizeBytes)}</span>
                    <span style={{ fontSize: 11, color: '#9e998f' }}>Added {new Date(doc.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => downloadDoc(doc)} style={{ height: 32, padding: '0 12px', fontSize: 12, fontWeight: 500, background: '#f0f9ff', color: '#0c4a6e', border: '1px solid #7dd3fc', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    ↓ Download
                  </button>
                  <button onClick={() => deleteDoc(doc.id)} style={{ width: 32, height: 32, fontSize: 16, background: '#fff', color: '#9e998f', border: '1px solid #e2ddd6', borderRadius: 8, cursor: 'pointer' }}>
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 24, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '14px 16px' }}>
          <p style={{ fontSize: 12, color: '#451a03', margin: 0, lineHeight: 1.6 }}>
            <strong>Browser storage:</strong> Documents are saved in your browser&apos;s local storage and are private to this device. They will be lost if you clear your browser data. Join the PropPilot waitlist to get cloud-synced document storage.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}