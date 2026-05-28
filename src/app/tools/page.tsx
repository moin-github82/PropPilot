'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SiteNav } from '../components/SiteNav'
import { Footer } from '../components/Footer'
import { getUser, type User } from '../lib/auth'

// Tools that require a paid plan (pro or enterprise)
const PAID_TOOL_HREFS = new Set(['/tools/maintenance', '/tools/documents'])

const tools = [
  {
    href:        '/tools/property-report',
    icon:        '🔍',
    title:       'Property Due Diligence Report',
    description: 'Enter an address and postcode to automatically check flood risk, EPC rating, crime stats, broadband speed, and council tax — and download a PDF report.',
    tag:         'Free with account',
  },
  {
    href:        '/tools/stamp-duty',
    icon:        '🏷️',
    title:       'Stamp Duty Calculator',
    description: 'Calculate your SDLT bill instantly — including first-time buyer relief and the 3% surcharge for additional properties.',
    tag:         'Free with account',
  },
  {
    href:        '/tools/lease-extension',
    icon:        '📋',
    title:       'Lease Extension Calculator',
    description: 'Estimate your lease extension premium using the Leasehold Reform Act 1993 formula. Know the cost before instructing a solicitor.',
    tag:         'Free with account',
  },
  {
    href:        '/tools/maintenance',
    icon:        '🔧',
    title:       'Maintenance Calendar',
    description: 'Track boiler services, gas safety checks, gutter cleans, and more. Get reminders before things become emergencies.',
    tag:         'Pro',
  },
  {
    href:        '/tools/documents',
    icon:        '📁',
    title:       'Document Vault',
    description: 'Store your EPC certificate, survey report, gas safe certificate, and planning documents in one place.',
    tag:         'Pro',
  },
  {
    href:        '/tools/checklist',
    icon:        '🧾',
    title:       'Property Buying Checklists',
    description: 'Interactive checklists for every buyer type — full UK buying guide, first-time buyer checklist, buy-to-let investor checklist, and a property risk scoring matrix.',
    tag:         'Free with account',
  },
]

function tagStyle(tag: string): React.CSSProperties {
  if (tag === 'Pro') {
    return {
      fontSize: 11, fontWeight: 600, background: '#eff6ff',
      border: '1px solid #bfdbfe', color: '#1d4ed8',
      borderRadius: 20, padding: '2px 10px', display: 'inline-block', marginBottom: 10,
    }
  }
  return {
    fontSize: 11, fontWeight: 500, background: '#f0fdf4',
    border: '1px solid #86efac', color: '#14532d',
    borderRadius: 20, padding: '2px 10px', display: 'inline-block', marginBottom: 10,
  }
}

export default function ToolsPage() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  const isPaid = user?.plan === 'pro' || user?.plan === 'enterprise'

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', display: 'flex', flexDirection: 'column' }}>
      <SiteNav />

      <main style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(32px,5vw,56px) clamp(16px,4vw,40px) 80px' }}>

        {/* Plan upgrade banner — shown to free users */}
        {user && !isPaid && (
          <div style={{
            background: '#eff6ff', border: '1px solid #bfdbfe',
            borderRadius: 14, padding: '14px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 16, marginBottom: 32, flexWrap: 'wrap' as const,
          }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1d4ed8', margin: '0 0 3px' }}>
                You&apos;re on the Free plan
              </p>
              <p style={{ fontSize: 13, color: '#3b82f6', margin: 0 }}>
                Upgrade to Pro to unlock the Maintenance Calendar and Document Vault.
              </p>
            </div>
            <Link
              href="/pricing"
              style={{
                fontSize: 13, fontWeight: 600, color: '#fff',
                background: '#2563eb', textDecoration: 'none',
                padding: '8px 18px', borderRadius: 10, whiteSpace: 'nowrap' as const,
              }}
            >
              View plans →
            </Link>
          </div>
        )}

        <div style={{ marginBottom: 48 }}>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#9e998f', display: 'block', marginBottom: 10 }}>
            Homeowner tools
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 500, color: '#1a1917', marginBottom: 14 }}>
            Calculators &amp; tools
          </h1>
          <p style={{ fontSize: 16, color: '#5e5a52', lineHeight: 1.7, maxWidth: 520, margin: 0 }}>
            Free tools to help you make better decisions — before you buy, and after.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
          {tools.map(tool => {
            const isPaidTool = PAID_TOOL_HREFS.has(tool.href)
            const locked = isPaidTool && !isPaid

            if (locked) {
              return (
                <Link key={tool.href} href="/pricing" style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      background: '#fafafa', border: '1px solid #e2ddd6', borderRadius: 16,
                      padding: '28px', cursor: 'pointer', height: '100%',
                      transition: 'box-shadow 0.15s, border-color 0.15s', opacity: 0.85,
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLDivElement
                      el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
                      el.style.borderColor = '#2563eb'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLDivElement
                      el.style.boxShadow = 'none'
                      el.style.borderColor = '#e2ddd6'
                    }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16, filter: 'grayscale(0.4)' }}>
                      {tool.icon}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <span style={tagStyle(tool.tag)}>{tool.tag}</span>
                      <span style={{ fontSize: 13 }}>🔒</span>
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, color: '#1a1917', margin: '0 0 10px' }}>{tool.title}</h2>
                    <p style={{ fontSize: 13, color: '#5e5a52', lineHeight: 1.7, margin: '0 0 12px' }}>{tool.description}</p>
                    <p style={{ fontSize: 12, color: '#2563eb', fontWeight: 500, margin: 0 }}>Upgrade to Pro to unlock →</p>
                  </div>
                </Link>
              )
            }

            return (
              <Link key={tool.href} href={tool.href} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    background: '#fff', border: '1px solid #e2ddd6', borderRadius: 16,
                    padding: '28px', cursor: 'pointer', height: '100%',
                    transition: 'box-shadow 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
                    el.style.borderColor = '#1D9E75'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.boxShadow = 'none'
                    el.style.borderColor = '#e2ddd6'
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>
                    {tool.icon}
                  </div>
                  <span style={tagStyle(tool.tag)}>{tool.tag}</span>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, color: '#1a1917', margin: '8px 0 10px' }}>{tool.title}</h2>
                  <p style={{ fontSize: 13, color: '#5e5a52', lineHeight: 1.7, margin: 0 }}>{tool.description}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
      <Footer />
    </div>
  )
}
