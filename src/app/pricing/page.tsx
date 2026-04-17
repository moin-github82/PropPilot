'use client'

import { useState } from 'react'
import Link from 'next/link'
import { NavBar } from '../components/NavBar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plan {
  name: string
  price: string
  period: string
  annual?: string | null
  tag: string | null
  color: string
  features: string[]
  notIncluded: string[]
  cta: string
  ctaHref: string
  ctaStyle: string
}

// ─── Plan data ────────────────────────────────────────────────────────────────

const BUYER_PLANS: Plan[] = [
  {
    name: 'Free',
    price: '£0',
    period: 'forever',
    tag: null,
    color: '#1a1917',
    features: [
      'Stamp Duty & Lease Extension calculators',
      'Full property buying checklist (FTB, Standard, BTL)',
      'Property risk scoring matrix',
      '3 automated property reports per month',
      'Flood risk, crime & broadband checks',
    ],
    notIncluded: [
      'Unlimited property reports',
      'EPC certificate lookup',
      'PDF report downloads',
      'Professional services discount',
    ],
    cta: 'Get started free',
    ctaHref: '/signup?role=buyer',
    ctaStyle: 'outline',
  },
  {
    name: 'Pro',
    price: '£19',
    period: '/month',
    annual: '£149/yr — save 35%',
    tag: 'Most popular',
    color: '#1D9E75',
    features: [
      'Everything in Free, plus:',
      'Unlimited automated property reports',
      'EPC certificate lookup & upgrade history',
      'Save & compare up to 10 properties',
      'PDF report downloads',
      '10% off all professional services',
      'Priority email support',
    ],
    notIncluded: [
      'White-label PDF reports',
      'Bulk API access',
      'Team seats',
    ],
    cta: 'Start Pro — 14 days free',
    ctaHref: '/signup?role=buyer&plan=pro',
    ctaStyle: 'solid',
  },
  {
    name: 'Enterprise',
    price: '£79',
    period: '/month',
    annual: null,
    tag: null,
    color: '#1a1917',
    features: [
      'Everything in Pro, plus:',
      'Unlimited saved properties',
      'White-label branded PDF reports',
      'Bulk postcode API (1,000 checks/month)',
      'Team seats — up to 10 users',
      'Dedicated account manager',
      'Volume discounts on professional services',
      'Estate agent & broker integrations',
    ],
    notIncluded: [],
    cta: 'Contact sales',
    ctaHref: 'mailto:hello@proppilot.co.uk',
    ctaStyle: 'dark',
  },
]

const OWNER_PLANS: Plan[] = [
  {
    name: 'Free',
    price: '£0',
    period: 'forever',
    annual: null,
    tag: null,
    color: '#1a1917',
    features: [
      'Maintenance calendar (up to 5 tasks)',
      'Document vault (up to 3 documents)',
      'EPC rating check',
      'Stamp Duty calculator',
    ],
    notIncluded: [
      'Email reminders',
      'Full property dashboard',
      'EPC improvement tracking',
      'Mortgage renewal alerts',
    ],
    cta: 'Get started free',
    ctaHref: '/signup?role=owner',
    ctaStyle: 'outline',
  },
  {
    name: 'Pro',
    price: '£9',
    period: '/month',
    annual: '£79/yr — save 27%',
    tag: 'Most popular',
    color: '#1D9E75',
    features: [
      'Everything in Free, plus:',
      'Full maintenance calendar + email reminders',
      'Unlimited document vault',
      'Full property dashboard (value, EPC, mortgage)',
      'EPC improvement tracking & upgrade alerts',
      'Mortgage renewal reminders',
      'Gas safety & EICR renewal alerts',
      '10% off professional services',
      'Priority email support',
    ],
    notIncluded: [
      'Multiple properties',
      'Compliance reporting',
      'Multi-user access',
    ],
    cta: 'Start Pro — 14 days free',
    ctaHref: '/signup?role=owner&plan=pro',
    ctaStyle: 'solid',
  },
  {
    name: 'Enterprise',
    price: '£29',
    period: '/month',
    annual: null,
    tag: null,
    color: '#1a1917',
    features: [
      'Everything in Pro, plus:',
      'Up to 20 properties (landlords & portfolios)',
      'Rental compliance tracking',
      'Automated gas & EICR renewal reminders',
      'Multi-user access — up to 5 seats',
      'Exportable compliance reports',
      'Tenant management basics',
      'Priority phone support',
    ],
    notIncluded: [],
    cta: 'Contact sales',
    ctaHref: 'mailto:hello@proppilot.co.uk',
    ctaStyle: 'dark',
  },
]

const PROF_SERVICES = [
  { icon: '⚖️', name: 'Title Register & Legal Checks', price: 'from £800', desc: 'Solicitor review of title, covenants & searches' },
  { icon: '🏗️', name: 'Structural Survey (RICS Level 2/3)',  price: 'from £500', desc: 'Full building inspection with condition ratings' },
  { icon: '🔥', name: 'Gas Safety Certificate (CP12)',       price: 'from £60',  desc: 'Gas Safe registered engineer — all appliances' },
  { icon: '⚡', name: 'EICR Electrical Report',              price: 'from £150', desc: 'Full electrical installation condition report' },
]

const FAQS = [
  { q: 'Can I switch between HomeBuyer and HomeOwner?', a: 'Yes — once you complete your purchase, contact support and we\'ll upgrade your account to a HomeOwner plan and migrate your data.' },
  { q: 'Is there a free trial for Pro?', a: 'Yes. All Pro plans come with a 14-day free trial. No credit card required to start.' },
  { q: 'How do professional services work?', a: 'We connect you with vetted, locally-based professionals. You receive quotes, compare, and choose who to instruct — Pro/Enterprise members receive 10% off all bookings.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Monthly plans cancel with one click — no notice period, no exit fees. Annual plans are non-refundable after 14 days.' },
  { q: 'Do HomeBuyer and HomeOwner plans include the same professional services?', a: 'Professional services are available to all paid plans. HomeBuyer Pro focuses on pre-purchase services (legal, survey, gas cert, EICR). HomeOwner Pro adds ongoing compliance reminders and maintenance alerts.' },
]

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({ plan }: { plan: Plan }) {
  const isPopular = plan.tag === 'Most popular'
  return (
    <div style={{
      position: 'relative',
      background: '#fff',
      border: isPopular ? `2px solid ${plan.color}` : '1px solid #e2ddd6',
      borderRadius: 16,
      padding: '28px 24px 24px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {isPopular && (
        <div style={{
          position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
          background: plan.color, color: '#fff', fontSize: 11, fontWeight: 700,
          padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap',
        }}>
          ★ Most popular
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9e998f', margin: '0 0 6px' }}>{plan.name}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 500, color: '#1a1917' }}>{plan.price}</span>
          {plan.period !== 'forever' && <span style={{ fontSize: 14, color: '#9e998f' }}>{plan.period}</span>}
          {plan.period === 'forever' && <span style={{ fontSize: 14, color: '#9e998f' }}>forever</span>}
        </div>
        {plan.annual && (
          <p style={{ fontSize: 12, color: plan.color, fontWeight: 600, margin: 0 }}>or {plan.annual}</p>
        )}
      </div>

      <ul style={{ flex: 1, listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {plan.features.map((f, i) => (
          <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: f.startsWith('Everything') ? '#9e998f' : '#1D9E75', fontWeight: 700, fontSize: 13, flexShrink: 0, marginTop: 1 }}>
              {f.startsWith('Everything') ? '↳' : '✓'}
            </span>
            <span style={{ fontSize: 13, color: f.startsWith('Everything') ? '#9e998f' : '#1a1917', lineHeight: 1.5 }}>{f}</span>
          </li>
        ))}
        {plan.notIncluded.map((f, i) => (
          <li key={`no-${i}`} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', opacity: 0.4 }}>
            <span style={{ color: '#9e998f', fontSize: 13, flexShrink: 0 }}>—</span>
            <span style={{ fontSize: 13, color: '#9e998f', lineHeight: 1.5 }}>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={plan.ctaHref}
        style={{
          display: 'block', textAlign: 'center', padding: '12px 16px',
          borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none',
          background: plan.ctaStyle === 'solid' ? plan.color : plan.ctaStyle === 'dark' ? '#1a1917' : '#fff',
          color: plan.ctaStyle === 'outline' ? plan.color : '#fff',
          border: plan.ctaStyle === 'outline' ? `1.5px solid ${plan.color}` : 'none',
        }}
      >
        {plan.cta} →
      </Link>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState<'buyer' | 'owner'>('buyer')

  const tabBtn = (role: 'buyer' | 'owner', label: string, emoji: string, sub: string) => {
    const active = activeTab === role
    return (
      <button
        onClick={() => setActiveTab(role)}
        style={{
          flex: 1, padding: '16px 20px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
          border: active ? '2px solid #1D9E75' : '1.5px solid #e2ddd6',
          background: active ? '#f0fdf4' : '#fff',
          fontFamily: 'var(--font-body)', transition: 'all 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>{emoji}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: active ? '#14532d' : '#1a1917' }}>{label}</span>
          {active && <span style={{ fontSize: 11, background: '#1D9E75', color: '#fff', borderRadius: 20, padding: '1px 8px', fontWeight: 600 }}>Selected</span>}
        </div>
        <p style={{ fontSize: 12, color: active ? '#166534' : '#9e998f', margin: 0 }}>{sub}</p>
      </button>
    )
  }

  return (
    <div style={{ background: '#f8f7f4', minHeight: '100vh' }}>
      <NavBar
        rightSlot={
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link href="/" style={{ fontSize: 13, color: '#5e5a52', textDecoration: 'none' }}>← Home</Link>
            <Link href="/login"  style={{ fontSize: 13, color: '#1D9E75', fontWeight: 500, textDecoration: 'none' }}>Sign in</Link>
            <Link href="/signup" style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: '#1D9E75', textDecoration: 'none', padding: '8px 16px', borderRadius: 8 }}>Sign up free</Link>
          </div>
        }
        mobileItems={[
          { label: '← Home',      href: '/'       },
          { label: 'Sign in',     href: '/login'  },
          { label: 'Sign up',     href: '/signup' },
        ]}
      />

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: 'clamp(48px,6vw,72px) clamp(16px,4vw,40px) 40px', maxWidth: 680, margin: '0 auto' }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1D9E75', display: 'block', marginBottom: 12 }}>Pricing</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 500, color: '#1a1917', margin: '0 0 14px' }}>
          Simple, transparent pricing
        </h1>
        <p style={{ fontSize: 16, color: '#5e5a52', margin: 0, lineHeight: 1.7 }}>
          Start free — no credit card needed. Different plans for buyers and owners, because the two journeys are completely different.
        </p>
      </div>

      {/* Role selector tabs */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 clamp(16px,4vw,40px) 40px' }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#9e998f', marginBottom: 10, textAlign: 'center' }}>I am a…</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {tabBtn('buyer', 'HomeBuyer', '🏡', 'Searching for a property to buy')}
          {tabBtn('owner', 'HomeOwner', '🏠', 'I already own a home or portfolio')}
        </div>
      </div>

      {/* Context strip */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 clamp(16px,4vw,40px) 32px' }}>
        {activeTab === 'buyer' ? (
          <div style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 24 }}>🏡</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1917', margin: '0 0 2px' }}>HomeBuyer plans</p>
              <p style={{ fontSize: 13, color: '#5e5a52', margin: 0 }}>
                Automated property due diligence, buying checklists, calculators, and access to vetted professionals — for anyone searching for, offering on, or completing on a property.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['FTB', 'Moving home', 'Buy-to-let', 'Agents & brokers'].map(t => (
                <span key={t} style={{ fontSize: 11, background: '#f0fdf4', color: '#14532d', border: '1px solid #86efac', borderRadius: 20, padding: '2px 10px', whiteSpace: 'nowrap' }}>{t}</span>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 24 }}>🏠</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1917', margin: '0 0 2px' }}>HomeOwner plans</p>
              <p style={{ fontSize: 13, color: '#5e5a52', margin: 0 }}>
                Property dashboard, maintenance calendar, EPC improvement tracking, remortgage alerts, and compliance tools — for anyone who already owns a residential or rental property.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Owner-occupiers', 'Landlords', 'Portfolios'].map(t => (
                <span key={t} style={{ fontSize: 11, background: '#f0f9ff', color: '#0c4a6e', border: '1px solid #7dd3fc', borderRadius: 20, padding: '2px 10px', whiteSpace: 'nowrap' }}>{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Plan cards */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 clamp(16px,4vw,40px) 64px' }}>
        <div className="pp-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {(activeTab === 'buyer' ? BUYER_PLANS : OWNER_PLANS).map(plan => (
            <PlanCard key={plan.name} plan={plan} />
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: 12, color: '#9e998f', marginTop: 20 }}>
          All prices exclude VAT. Pro plans include a 14-day free trial — cancel anytime.
        </p>
      </div>

      {/* What changes between roles — comparison */}
      <div style={{ background: '#fff', padding: 'clamp(40px,5vw,64px) clamp(16px,4vw,40px)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,3vw,30px)', fontWeight: 500, color: '#1a1917', textAlign: 'center', margin: '0 0 8px' }}>
            What&apos;s different between the two plans?
          </h2>
          <p style={{ fontSize: 14, color: '#9e998f', textAlign: 'center', margin: '0 0 36px' }}>
            HomeBuyer and HomeOwner plans are designed for completely different stages of the property journey.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              {
                role: 'HomeBuyer 🏡', color: '#14532d', bg: '#f0fdf4', border: '#86efac',
                points: [
                  'Automated checks on any property by postcode (flood, EPC, crime, broadband)',
                  'Property buying checklists for FTB, standard, and BTL',
                  'Stamp Duty and Lease Extension calculators',
                  'Access to vetted solicitors, surveyors, gas engineers, electricians',
                  'Save and compare multiple properties side by side',
                  'PDF due diligence reports to share with your solicitor',
                ],
              },
              {
                role: 'HomeOwner 🏠', color: '#0c4a6e', bg: '#f0f9ff', border: '#7dd3fc',
                points: [
                  'Property dashboard with live value estimates and equity tracking',
                  'Maintenance calendar with reminders before things break',
                  'EPC improvement tracker with grant eligibility check',
                  'Remortgage radar — alerts when to act before your fix ends',
                  'Document vault for EPC, survey, gas certs, and planning docs',
                  'Gas safety, EICR, and compliance reminders for landlords',
                ],
              },
            ].map(col => (
              <div key={col.role} style={{ background: col.bg, border: `1px solid ${col.border}`, borderRadius: 14, padding: '24px 22px' }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: col.color, margin: '0 0 16px' }}>{col.role}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {col.points.map((p, i) => (
                    <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: col.color, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: 13, color: '#1a1917', lineHeight: 1.5 }}>{p}</span>
                    </li>
                  ))}
                </ul>
                <Link href={col.role.includes('Buyer') ? '/signup?role=buyer' : '/signup?role=owner'} style={{ display: 'block', marginTop: 20, textAlign: 'center', padding: '10px 0', fontSize: 13, fontWeight: 600, background: col.color, color: '#fff', borderRadius: 8, textDecoration: 'none' }}>
                  Get started free →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Professional services */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(40px,5vw,64px) clamp(16px,4vw,40px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9e998f', display: 'block', marginBottom: 8 }}>Add-on services</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px,3vw,28px)', fontWeight: 500, color: '#1a1917', margin: '0 0 8px' }}>Professional services — vetted &amp; booked through PropPilot</h2>
          <p style={{ fontSize: 14, color: '#9e998f', margin: 0 }}>Pro &amp; Enterprise members get 10% off all bookings.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 14 }}>
          {PROF_SERVICES.map(svc => (
            <div key={svc.name} style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 28, margin: '0 0 10px' }}>{svc.icon}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1917', margin: '0 0 4px', lineHeight: 1.4 }}>{svc.name}</p>
              <p style={{ fontSize: 11, color: '#9e998f', margin: '0 0 8px', lineHeight: 1.4 }}>{svc.desc}</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1D9E75', margin: 0 }}>{svc.price}</p>
              <p style={{ fontSize: 10, color: '#9e998f', margin: '4px 0 0' }}>10% off for Pro/Enterprise</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ background: '#fff', padding: 'clamp(40px,5vw,64px) clamp(16px,4vw,40px)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px,3vw,28px)', fontWeight: 500, color: '#1a1917', textAlign: 'center', margin: '0 0 32px' }}>
            Frequently asked questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ background: '#f8f7f4', borderRadius: 12, padding: '18px 20px' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1917', margin: '0 0 6px' }}>{faq.q}</p>
                <p style={{ fontSize: 13, color: '#5e5a52', margin: 0, lineHeight: 1.6 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{ background: '#1a1917', padding: 'clamp(40px,5vw,64px) clamp(16px,4vw,40px)', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,3vw,32px)', fontWeight: 500, color: '#fff', margin: '0 0 12px' }}>
          Start free — no credit card needed
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', margin: '0 0 28px' }}>Join thousands of buyers and owners using PropPilot.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup?role=buyer" style={{ padding: '12px 24px', background: '#1D9E75', color: '#fff', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            🏡 I&apos;m buying a home →
          </Link>
          <Link href="/signup?role=owner" style={{ padding: '12px 24px', background: '#fff', color: '#1a1917', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            🏠 I own a home →
          </Link>
        </div>
      </div>
    </div>
  )
}
