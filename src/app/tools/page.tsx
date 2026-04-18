'use client'

import Link from 'next/link'
import { SiteNav } from '../components/SiteNav'
import { Footer } from '../components/Footer'

const tools = [
  {
    href:        '/tools/property-report',
    icon:        '🔍',
    title:       'Property Due Diligence Report',
    description: 'Enter an address and postcode to automatically check flood risk, EPC rating, crime stats, broadband speed, and council tax — and download a PDF report.',
    tag:         'Automated checks',
    tagColor:    '#f0fdf4',
    tagBorder:   '#86efac',
    tagText:     '#14532d',
  },
  {
    href:        '/tools/stamp-duty',
    icon:        '🏷️',
    title:       'Stamp Duty Calculator',
    description: 'Calculate your SDLT bill instantly — including first-time buyer relief and the 3% surcharge for additional properties.',
    tag:         'Free tool',
    tagColor:    '#f0fdf4',
    tagBorder:   '#86efac',
    tagText:     '#14532d',
  },
  {
    href:        '/tools/lease-extension',
    icon:        '📋',
    title:       'Lease Extension Calculator',
    description: 'Estimate your lease extension premium using the Leasehold Reform Act 1993 formula. Know the cost before instructing a solicitor.',
    tag:         'Free tool',
    tagColor:    '#f0fdf4',
    tagBorder:   '#86efac',
    tagText:     '#14532d',
  },
  {
    href:        '/tools/maintenance',
    icon:        '🔧',
    title:       'Maintenance Calendar',
    description: 'Track boiler services, gas safety checks, gutter cleans, and more. Get reminders before things become emergencies.',
    tag:         'Free tool',
    tagColor:    '#f0f9ff',
    tagBorder:   '#7dd3fc',
    tagText:     '#0c4a6e',
  },
  {
    href:        '/tools/documents',
    icon:        '📁',
    title:       'Document Vault',
    description: 'Store your EPC certificate, survey report, gas safe certificate, and planning documents in one place.',
    tag:         'Free tool',
    tagColor:    '#f0f9ff',
    tagBorder:   '#7dd3fc',
    tagText:     '#0c4a6e',
  },
  {
    href:        '/tools/checklist',
    icon:        '🧾',
    title:       'Property Buying Checklists',
    description: 'Interactive checklists for every buyer type — full UK buying guide, first-time buyer checklist, buy-to-let investor checklist, and a property risk scoring matrix.',
    tag:         'Free tool',
    tagColor:    '#f0fdf4',
    tagBorder:   '#86efac',
    tagText:     '#14532d',
  },
]

export default function ToolsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4' }}>
      <SiteNav />

      <main style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(32px,5vw,56px) clamp(16px,4vw,40px) 80px' }}>
        <div style={{ marginBottom: 48 }}>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9e998f', display: 'block', marginBottom: 10 }}>
            Free homeowner tools
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 500, color: '#1a1917', marginBottom: 14 }}>
            Calculators & tools
          </h1>
          <p style={{ fontSize: 16, color: '#5e5a52', lineHeight: 1.7, maxWidth: 520, margin: 0 }}>
            Free tools to help you make better decisions — before you buy, and after.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
          {tools.map(tool => (
            <Link key={tool.href} href={tool.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 16, padding: '28px', cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s', height: '100%' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#1D9E75' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.borderColor = '#e2ddd6' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>
                  {tool.icon}
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, background: tool.tagColor, border: `1px solid ${tool.tagBorder}`, color: tool.tagText, borderRadius: 20, padding: '2px 10px', display: 'inline-block', marginBottom: 10 }}>
                  {tool.tag}
                </span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, color: '#1a1917', margin: '8px 0 10px' }}>{tool.title}</h2>
                <p style={{ fontSize: 13, color: '#5e5a52', lineHeight: 1.7, margin: 0 }}>{tool.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  )
}