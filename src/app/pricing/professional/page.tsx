'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SiteNav } from '../../components/SiteNav'
import { Footer } from '../../components/Footer'
import { getUser, type User } from '../../lib/auth'

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Service {
  id:          string
  icon:        string
  title:       string
  subtitle:    string
  description: string
  includes:    string[]
  priceRange:  string
  priceFrom:   string
  timeline:    string
  why:         string
  badge:       string
}

const SERVICES: Service[] = [
  {
    id:          'legal',
    icon:        '⚖️',
    title:       'Title Register & Legal Checks',
    subtitle:    'Conveyancing solicitor review',
    badge:       'Most requested',
    description: 'A PropPilot-vetted conveyancing solicitor reviews the official title register, checks for restrictive covenants, boundary disputes, planning enforcement notices, and any charges or restrictions on the property.',
    includes: [
      'Official title register & title plan (HMLR)',
      'Restrictive covenants & easements review',
      'Local Authority & drainage searches',
      'Planning & building regulations check',
      'Boundary & rights of way verification',
      'Written legal summary report',
    ],
    priceRange: '£800 – £1,500',
    priceFrom:  '£800',
    timeline:   '5–10 working days',
    why:        'Legal issues are the most common cause of aborted purchases. Catching a covenant or boundary problem early can save thousands in aborted fees.',
  },
  {
    id:          'survey',
    icon:        '🏗️',
    title:       'Structural Survey',
    subtitle:    'RICS Level 2 or Level 3',
    badge:       'Essential',
    description: 'A RICS-accredited surveyor carries out a full inspection — roof, walls, foundations, drainage, electrics, and more. You receive a detailed written report with condition ratings and cost estimates for any defects found.',
    includes: [
      'Full inspection of roof, walls & foundations',
      'Damp, mould & timber condition assessment',
      'Boiler, heating & plumbing overview',
      'Electrical consumer unit check',
      'Loft, drainage & external inspection',
      'Condition ratings (1–3) with cost estimates',
    ],
    priceRange: '£500 – £1,500',
    priceFrom:  '£500',
    timeline:   '3–5 working days after inspection',
    why:        'A £600 survey can save you from buying a property with £30,000 of hidden defects. Never rely on the mortgage lender\'s valuation alone.',
  },
  {
    id:          'gas',
    icon:        '🔥',
    title:       'Gas Safety Certificate',
    subtitle:    'CP12 — Gas Safe registered engineer',
    badge:       '',
    description: 'A Gas Safe registered engineer inspects and tests all gas appliances, pipework, and the boiler. You receive a CP12 certificate — legally required for lettings and essential for any purchase with gas appliances.',
    includes: [
      'Boiler inspection & flue test',
      'All gas appliances checked & tested',
      'Gas pipework pressure test',
      'Carbon monoxide risk assessment',
      'CP12 certificate issued on the day',
      'Written defect report if issues found',
    ],
    priceRange: '£60 – £120',
    priceFrom:  '£60',
    timeline:   'Same day or next day',
    why:        'Faulty gas appliances cause over 40 deaths per year in the UK. A CP12 confirms the property is safe and is required annually for lettings.',
  },
  {
    id:          'eicr',
    icon:        '⚡',
    title:       'EICR Electrical Report',
    subtitle:    'Electrical Installation Condition Report',
    badge:       '',
    description: 'A qualified electrician carries out a full EICR on the property\'s wiring, consumer unit, sockets, and fixed appliances. Mandatory for all rented properties — strongly advised for any purchase.',
    includes: [
      'Full inspection of consumer unit (fuse box)',
      'Wiring condition & earthing check',
      'All sockets, switches & lighting tested',
      'RCD protection verification',
      'Code C1/C2/C3 defect classification',
      'EICR certificate valid for 5 years',
    ],
    priceRange: '£150 – £300',
    priceFrom:  '£150',
    timeline:   '1–2 working days',
    why:        'EICRs are mandatory for all rented properties. Old wiring is a leading cause of house fires — don\'t leave this to chance.',
  },
]

const BUNDLE = {
  title:       'Full Due Diligence Bundle',
  description: 'All four checks arranged and coordinated by PropPilot — one point of contact, no chasing individual contractors.',
  priceRange:  '£1,400 – £2,800',
  saving:      'Save up to £350 vs. booking individually',
  includes: [
    'Title Register & Legal Checks',
    'RICS Structural Survey',
    'Gas Safety Certificate (CP12)',
    'EICR Electrical Report',
    'Dedicated PropPilot coordinator',
    'Single combined PDF summary',
  ],
}

const FAQS = [
  {
    q: 'Are these professionals vetted by PropPilot?',
    a: 'Yes — all surveyors, solicitors, and engineers in our network are regulated professionals. Surveyors hold RICS accreditation, solicitors are SRA-regulated, and engineers are Gas Safe and NICEIC registered.',
  },
  {
    q: 'When should I order these checks?',
    a: 'Ideally after your offer is accepted but before you exchange contracts. The survey and legal checks in particular should be complete before you commit legally and financially to the purchase.',
  },
  {
    q: 'Do Pro plan members get a discount?',
    a: 'Yes — Pro and Enterprise subscribers receive 10% off all professional services. The discount is applied automatically when you request a quote.',
  },
  {
    q: 'How do I book once I request a quote?',
    a: 'After submitting your enquiry, a PropPilot coordinator will be in touch within one working day to confirm your requirements, match you with the right professional, and arrange a convenient time.',
  },
  {
    q: 'Can I book just one service, or do I need the bundle?',
    a: 'You can book any combination of individual services. The bundle is simply a discounted, coordinated package for buyers who want the full picture before exchanging.',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfessionalPricingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#f8f7f4' }} />}>
      <ProfessionalPricingContent />
    </Suspense>
  )
}

function ProfessionalPricingContent() {
  const searchParams  = useSearchParams()
  const highlightId   = searchParams?.get('service') ?? null
  const postcode      = searchParams?.get('postcode') ?? ''
  const address       = searchParams?.get('address') ?? ''

  const [user, setUser]         = useState<User | null>(null)
  const [openFaq, setOpenFaq]   = useState<number | null>(null)

  useEffect(() => { setUser(getUser()) }, [])

  const isPro = user?.plan === 'pro' || user?.plan === 'enterprise'

  const enquiryParams = [
    postcode && `postcode=${encodeURIComponent(postcode)}`,
    address  && `address=${encodeURIComponent(address)}`,
  ].filter(Boolean).join('&')

  const quoteHref = (svcId: string) =>
    `mailto:hello@proppilot.co.uk?subject=${encodeURIComponent(`Quote request — ${SERVICES.find(s => s.id === svcId)?.title ?? svcId}`)}&body=${encodeURIComponent([
      `Hi PropPilot,`,
      ``,
      `I'd like a quote for: ${SERVICES.find(s => s.id === svcId)?.title}`,
      postcode ? `Property postcode: ${postcode}` : '',
      address  ? `Property address: ${address}`  : '',
      ``,
      `Please get in touch to confirm availability and pricing.`,
      ``,
      `Thanks`,
    ].filter(l => l !== undefined).join('\n'))}`

  const bundleHref =
    `mailto:hello@proppilot.co.uk?subject=${encodeURIComponent('Quote request — Full Due Diligence Bundle')}&body=${encodeURIComponent([
      `Hi PropPilot,`,
      ``,
      `I'd like a quote for the Full Due Diligence Bundle (all four checks).`,
      postcode ? `Property postcode: ${postcode}` : '',
      address  ? `Property address: ${address}`  : '',
      ``,
      `Please get in touch to confirm availability and pricing.`,
    ].filter(Boolean).join('\n'))}`

  const card: React.CSSProperties = {
    background: '#fff', border: '1px solid #e2ddd6', borderRadius: 16, overflow: 'hidden',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', display: 'flex', flexDirection: 'column' }}>
      <SiteNav />

      <main style={{ maxWidth: 900, margin: '0 auto', width: '100%', flex: 1, padding: 'clamp(32px,5vw,56px) clamp(16px,4vw,40px) 80px' }}>

        {/* ── Hero ── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Link href="/pricing" style={{ fontSize: 12, color: '#9e998f', textDecoration: 'none' }}>Plans & pricing</Link>
            <span style={{ color: '#d1cdc7', fontSize: 12 }}>›</span>
            <span style={{ fontSize: 12, color: '#1a1917', fontWeight: 500 }}>Professional services</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9e998f', display: 'block', marginBottom: 10 }}>PropPilot Premium</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 500, color: '#1a1917', margin: '0 0 14px' }}>
            Professional checks & services
          </h1>
          <p style={{ fontSize: 15, color: '#5e5a52', lineHeight: 1.7, maxWidth: 580, margin: '0 0 20px' }}>
            Vetted UK professionals — conveyancing solicitors, RICS surveyors, Gas Safe engineers, and electricians — coordinated through PropPilot. Book individually or as a bundle.
          </p>

          {/* Pro discount notice */}
          {isPro ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '8px 14px' }}>
              <span style={{ fontSize: 16 }}>✓</span>
              <p style={{ fontSize: 13, color: '#14532d', margin: 0, fontWeight: 500 }}>Your Pro plan discount (10% off) is applied automatically when you request a quote.</p>
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #e2ddd6', borderRadius: 10, padding: '10px 16px' }}>
              <span style={{ fontSize: 14 }}>💡</span>
              <p style={{ fontSize: 13, color: '#5e5a52', margin: 0 }}>
                <Link href="/pricing" style={{ color: '#1D9E75', fontWeight: 600, textDecoration: 'none' }}>Upgrade to Pro</Link>
                {' '}to get 10% off all professional services.
              </p>
            </div>
          )}
        </div>

        {/* ── Bundle highlight ── */}
        <div style={{ background: 'linear-gradient(135deg, #1a1917 0%, #2d2b28 100%)', borderRadius: 16, padding: 'clamp(24px,4vw,36px)', marginBottom: 32, display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px 32px', alignItems: 'center' }}
          className="pp-bundle-grid"
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f59e0b' }}>Best value</span>
              <span style={{ fontSize: 11, background: '#f59e0b', color: '#1a1917', borderRadius: 20, padding: '1px 8px', fontWeight: 700 }}>Bundle</span>
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(18px,2.5vw,24px)', fontWeight: 500, color: '#fff', margin: '0 0 6px' }}>{BUNDLE.title}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '0 0 16px' }}>{BUNDLE.description}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginBottom: 16 }}>
              {BUNDLE.includes.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#1D9E75', fontSize: 12 }}>✓</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{item}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#f59e0b', margin: 0, fontWeight: 500 }}>💰 {BUNDLE.saving}</p>
          </div>
          <div style={{ textAlign: 'center', minWidth: 160 }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>Typical cost</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: '#fff', margin: '0 0 16px' }}>{BUNDLE.priceRange}</p>
            <a href={bundleHref} style={{ display: 'block', padding: '11px 20px', fontSize: 14, fontWeight: 600, background: '#f59e0b', color: '#1a1917', borderRadius: 8, textDecoration: 'none', textAlign: 'center' }}>
              Get bundle quote →
            </a>
            {isPro && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>10% Pro discount applied</p>}
          </div>
        </div>

        {/* ── Individual services ── */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: '#1a1917', margin: '0 0 16px' }}>Individual services</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
          {SERVICES.map(svc => {
            const isHighlighted = highlightId === svc.id || highlightId === svc.title
            return (
              <div key={svc.id} id={svc.id} style={{ ...card, border: isHighlighted ? '2px solid #1D9E75' : '1px solid #e2ddd6', boxShadow: isHighlighted ? '0 0 0 4px rgba(29,158,117,0.08)' : 'none' }}>
                {/* Card header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0ede8', display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px 24px', alignItems: 'start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 24 }}>{svc.icon}</span>
                      <div>
                        <p style={{ fontSize: 16, fontWeight: 600, color: '#1a1917', margin: 0 }}>{svc.title}</p>
                        <p style={{ fontSize: 12, color: '#9e998f', margin: 0 }}>{svc.subtitle}</p>
                      </div>
                      {svc.badge && (
                        <span style={{ fontSize: 11, background: '#fef9c3', color: '#713f12', border: '1px solid #fcd34d', borderRadius: 20, padding: '1px 8px', fontWeight: 600 }}>
                          {svc.badge}
                        </span>
                      )}
                      {isHighlighted && (
                        <span style={{ fontSize: 11, background: '#f0fdf4', color: '#14532d', border: '1px solid #86efac', borderRadius: 20, padding: '1px 8px', fontWeight: 600 }}>
                          Selected service
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: '#5e5a52', lineHeight: 1.6, margin: 0 }}>{svc.description}</p>
                  </div>
                  {/* Price + CTA */}
                  <div style={{ textAlign: 'center', minWidth: 150, flexShrink: 0 }}>
                    <div style={{ background: '#f8f7f4', border: '1px solid #e2ddd6', borderRadius: 10, padding: '12px 16px', marginBottom: 10 }}>
                      <p style={{ fontSize: 11, color: '#9e998f', margin: '0 0 2px' }}>Typical cost</p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: '#1a1917', margin: '0 0 4px' }}>{svc.priceRange}</p>
                      <p style={{ fontSize: 11, color: '#9e998f', margin: 0 }}>⏱ {svc.timeline}</p>
                    </div>
                    <a href={quoteHref(svc.id)} style={{ display: 'block', padding: '10px 0', fontSize: 13, fontWeight: 600, background: '#1D9E75', color: '#fff', borderRadius: 8, textDecoration: 'none', textAlign: 'center' }}>
                      Get a quote →
                    </a>
                    {isPro && (
                      <p style={{ fontSize: 11, color: '#1D9E75', marginTop: 6, fontWeight: 500 }}>10% Pro discount applied</p>
                    )}
                  </div>
                </div>

                {/* What's included + Why */}
                <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }} className="pp-service-body">
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9e998f', margin: '0 0 10px' }}>What&apos;s included</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {svc.includes.map(item => (
                        <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ color: '#1D9E75', fontSize: 12, flexShrink: 0, marginTop: 2 }}>✓</span>
                          <span style={{ fontSize: 13, color: '#5e5a52', lineHeight: 1.5 }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: '#f8f7f4', borderRadius: 10, padding: '14px 16px', alignSelf: 'start' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9e998f', margin: '0 0 8px' }}>Why it matters</p>
                    <p style={{ fontSize: 13, color: '#5e5a52', lineHeight: 1.6, margin: 0 }}>{svc.why}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── FAQ ── */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: '#1a1917', margin: '0 0 16px' }}>Frequently asked questions</h2>
          <div style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 14, overflow: 'hidden' }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ borderBottom: i < FAQS.length - 1 ? '1px solid #f0ede8' : 'none' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', textAlign: 'left', padding: '16px 22px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, fontFamily: 'var(--font-body)' }}
                >
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1917' }}>{faq.q}</span>
                  <span style={{ fontSize: 18, color: '#9e998f', flexShrink: 0, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(45deg)' : 'none' }}>+</span>
                </button>
                {openFaq === i && (
                  <p style={{ fontSize: 13, color: '#5e5a52', lineHeight: 1.7, margin: 0, padding: '0 22px 16px' }}>{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div style={{ background: 'linear-gradient(135deg, #1D9E75 0%, #15805e 100%)', borderRadius: 16, padding: 'clamp(24px,4vw,36px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: '#fff', margin: '0 0 6px' }}>Not sure which checks you need?</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
              Run a free automated property report first — it flags the risk areas so you only order the checks that matter.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link
              href={`/tools/property-report${enquiryParams ? `?${enquiryParams}` : ''}`}
              style={{ height: 40, padding: '0 18px', fontSize: 13, fontWeight: 600, background: '#fff', color: '#1D9E75', borderRadius: 8, textDecoration: 'none', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}
            >
              Run free report →
            </Link>
            {!isPro && (
              <Link
                href="/pricing"
                style={{ height: 40, padding: '0 18px', fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, textDecoration: 'none', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}
              >
                See Pro plans
              </Link>
            )}
          </div>
        </div>

      </main>

      <Footer />

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 640px) {
          .pp-bundle-grid { grid-template-columns: 1fr !important; }
          .pp-service-body { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
