'use client'

import { useState } from 'react'
import Link from 'next/link'
import { NavBar } from './components/NavBar'

// ─── Sub-components ──────────────────────────────────────────────────────────

function Nav() {
  return (
    <NavBar
      rightSlot={<>
        <Link href="#features" style={{ fontSize: 14, color: 'var(--slate-600)', textDecoration: 'none' }}>Features</Link>
        <Link href="#pricing"  style={{ fontSize: 14, color: 'var(--slate-600)', textDecoration: 'none' }}>Pricing</Link>
        <Link href="/tools"    style={{ fontSize: 14, color: 'var(--slate-600)', textDecoration: 'none' }}>Tools</Link>
        <Link href="/homebuyer" style={{ fontSize: 14, fontWeight: 500, color: '#1D9E75', textDecoration: 'none', background: '#e8f8f3', padding: '6px 14px', borderRadius: '8px', border: '1px solid #9fe1cb' }}>
          Buying? Check a property
        </Link>
        <Link href="/login" style={{ fontSize: 14, color: 'var(--slate-600)', textDecoration: 'none', padding: '6px 14px' }}>Sign in</Link>
        <a href="#waitlist" className="btn-primary" style={{ padding: '9px 20px', fontSize: 14 }}>Join waitlist</a>
      </>}
      mobileItems={[
        { label: 'Features',              href: '#features'  },
        { label: 'Pricing',               href: '#pricing'   },
        { label: 'Tools',                 href: '/tools'     },
        { label: 'Buying? Check a property', href: '/homebuyer' },
        { label: 'Sign in',               href: '/login'     },
        { label: 'Join waitlist',         href: '#waitlist'  },
      ]}
    />
  )
}

function Hero({ onJoin }: { onJoin: (email: string) => void }) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) { onJoin(email); setSubmitted(true) }
  }

  return (
    <section style={{
      maxWidth: 760, margin: '0 auto',
      padding: 'clamp(48px, 8vw, 80px) clamp(16px, 4vw, 40px) clamp(40px, 6vw, 60px)',
      textAlign: 'center',
    }}>
      <div className="fade-up">
        <span className="tag tag-green" style={{ marginBottom: 24, display: 'inline-block' }}>
          Now in early access · 847 homeowners on the waitlist
        </span>
      </div>

      <h1 className="fade-up-d1" style={{ fontSize: 'clamp(32px, 5vw, 58px)', fontWeight: 500, color: 'var(--slate-900)', marginBottom: 20 }}>
        Your home is your biggest asset.<br />
        <em style={{ fontStyle: 'italic', color: 'var(--brand-400)' }}>Start treating it like one.</em>
      </h1>

      <p className="fade-up-d2" style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'var(--slate-600)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 36px' }}>
        PropPilot tells you what your home is worth, what&apos;s likely to break, when to remortgage, and exactly what it&apos;ll cost to reach EPC Band C — all in one place.
      </p>

      {submitted ? (
        <div className="fade-up card" style={{ maxWidth: 440, margin: '0 auto', background: 'var(--brand-50)', border: '1px solid var(--brand-200)', padding: '20px 24px' }}>
          <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--brand-800)', margin: 0 }}>
            You&apos;re on the list. We&apos;ll be in touch soon.
          </p>
        </div>
      ) : (
        <form className="fade-up-d3 pp-hero-form" onSubmit={handleSubmit}>
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Enter your email address"
            style={{
              flex: 1, height: 48, padding: '0 16px', fontSize: 15,
              border: '1.5px solid var(--slate-200)', borderRadius: 'var(--radius-md)',
              background: '#fff', color: 'var(--slate-800)', outline: 'none',
              fontFamily: 'var(--font-body)', minWidth: 0,
            }}
          />
          <button type="submit" className="btn-primary" style={{ height: 48, whiteSpace: 'nowrap' }}>
            Get early access
          </button>
        </form>
      )}
      <p className="fade-up-d4" style={{ fontSize: 13, color: 'var(--slate-400)', margin: 0 }}>
        Free to start. No credit card needed.
      </p>
    </section>
  )
}

function SocialProof() {
  const stats = [
    { n: '19M',    l: 'UK homes below EPC Band C' },
    { n: '£2,500', l: 'Avg. annual maintenance spend' },
    { n: '1.6M',   l: 'Fixed-rate deals expire every year' },
  ]
  return (
    <div className="pp-stats-bar">
      {stats.map((s, i) => (
        <div key={i} className="pp-stat-item" style={{
          borderRight: i < stats.length - 1 ? '1px solid var(--slate-200)' : 'none',
        }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 500, color: 'var(--brand-400)', margin: '0 0 4px' }}>{s.n}</p>
          <p style={{ fontSize: 13, color: 'var(--slate-500)', margin: 0 }}>{s.l}</p>
        </div>
      ))}
    </div>
  )
}

function Problems() {
  const problems = [
    { icon: '⚡', title: 'EPC panic', body: 'You know you need Band C by 2030 but have no idea what it costs or where to start.', color: 'var(--amber-50)', iconBg: '#fef3c7' },
    { icon: '🔒', title: 'Remortgage roulette', body: 'Your fixed rate ends and you find out 6 months too late you could have locked in a better deal.', color: 'var(--brand-50)', iconBg: 'var(--brand-50)' },
    { icon: '🔧', title: 'Surprise repairs', body: 'The boiler dies in January. No warning, no budget. A £600 emergency callout you never saw coming.', color: '#fef2f2', iconBg: '#fee2e2' },
    { icon: '📋', title: 'Leasehold confusion', body: 'Service charges, ground rent, lease extensions — most leaseholders don\'t know what they owe or when to act.', color: '#f5f3ff', iconBg: '#ede9fe' },
  ]
  return (
    <section style={{ maxWidth: 960, margin: '0 auto', padding: 'clamp(40px,6vw,72px) clamp(16px,4vw,40px)' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <span className="tag tag-slate" style={{ marginBottom: 12, display: 'inline-block' }}>The problem</span>
        <h2 style={{ fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 500, color: 'var(--slate-900)', marginBottom: 16 }}>
          Owning a home has never been more complicated
        </h2>
        <p style={{ fontSize: 16, color: 'var(--slate-500)', maxWidth: 540, margin: '0 auto' }}>
          Most homeowners manage their biggest financial asset with a folder of PDFs and a vague sense of dread.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {problems.map((p, i) => (
          <div key={i} className="card" style={{ background: p.color, border: 'none' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: p.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 14 }}>{p.icon}</div>
            <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, marginBottom: 8, color: 'var(--slate-900)' }}>{p.title}</h3>
            <p style={{ fontSize: 13, color: 'var(--slate-600)', margin: 0, lineHeight: 1.6 }}>{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Features() {
  const features = [
    {
      tag: 'EPC upgrade planner', tagStyle: 'tag-green',
      title: 'Know exactly what your EPC upgrade will cost',
      body: 'We pull your official certificate from the EPC register and show you a ranked list of upgrades — cavity wall, loft insulation, heat pump — with real costs and every grant you qualify for, including ECO4 and the Boiler Upgrade Scheme.',
      aside: ['Band C target by 2030', 'ECO4 & BUS grants surfaced', 'Cost per upgrade shown'],
    },
    {
      tag: 'Maintenance predictor', tagStyle: 'tag-amber',
      title: 'Budget for repairs before they happen',
      body: 'Based on your property\'s age, type, and construction, PropPilot forecasts what\'s likely to need attention and when. Know a boiler replacement is coming in 2 years — not the day it fails.',
      aside: ['Property age & type used', 'Prioritised by urgency', 'Cost ranges included'],
    },
    {
      tag: 'Remortgage radar', tagStyle: 'tag-green',
      title: 'Never pay your lender\'s standard variable rate again',
      body: 'Tell us when your fix ends. We monitor the market and alert you at the ideal moment to act — typically 6 months before expiry. A 2-minute setup that saves thousands.',
      aside: ['Fix expiry tracking', 'Market rate monitoring', 'Optimal timing alerts'],
    },
    {
      tag: 'Property intelligence', tagStyle: 'tag-slate',
      title: 'Live value, renovation ROI, and equity tracking',
      body: 'Your property\'s current estimated value using Land Registry data, with a renovation calculator that shows what a loft conversion or new kitchen actually adds — before you commit.',
      aside: ['Land Registry data', 'Renovation ROI calculator', 'Equity & LTV tracking'],
    },
  ]

  return (
    <section id="features" style={{ background: '#fff', padding: 'clamp(40px,6vw,72px) 0' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 clamp(16px,4vw,40px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span className="tag tag-green" style={{ marginBottom: 12, display: 'inline-block' }}>What PropPilot does</span>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 500, color: 'var(--slate-900)' }}>
            Everything your home needs, in one place
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
          {features.map((f, i) => (
            <div key={i} className="pp-grid-feature">
              <div>
                <span className={`tag ${f.tagStyle}`} style={{ marginBottom: 14, display: 'inline-block' }}>{f.tag}</span>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 2vw, 26px)', fontWeight: 500, color: 'var(--slate-900)', marginBottom: 14, lineHeight: 1.3 }}>{f.title}</h3>
                <p style={{ fontSize: 15, color: 'var(--slate-600)', lineHeight: 1.75, margin: 0 }}>{f.body}</p>
              </div>
              <div className="card" style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)' }}>
                {f.aside.map((a, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: j < f.aside.length - 1 ? '1px solid var(--slate-200)' : 'none' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-400)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--slate-700)' }}>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function EPCCallout() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 clamp(16px,4vw,40px) clamp(40px,6vw,72px)' }}>
      <div className="pp-epc-callout" style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-200)', borderRadius: 'var(--radius-xl)', padding: 'clamp(24px,4vw,40px) clamp(20px,4vw,48px)' }}>
        <div>
          <span className="tag tag-green" style={{ marginBottom: 14, display: 'inline-block' }}>EPC deadline — 2030</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 500, color: 'var(--brand-800)', marginBottom: 12 }}>
            61% of UK homes need to upgrade. Most homeowners don&apos;t know where to start.
          </h2>
          <p style={{ fontSize: 15, color: 'var(--brand-600)', lineHeight: 1.7, margin: 0 }}>
            Lenders are already factoring EPC ratings into mortgage offers. A Band D home today could mean a lower loan-to-value ceiling tomorrow. PropPilot gives you a clear, costed roadmap.
          </p>
        </div>
        <a href="#waitlist" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
          Check my EPC band →
        </a>
      </div>
    </div>
  )
}

function Testimonials() {
  const testimonials = [
    { quote: 'Found out I qualify for ECO4 insulation funding worth £8,000. Took 3 minutes. I\'d been ignoring the EPC letter for two years.', name: 'Sarah H.', role: 'Semi-detached, Leeds', initials: 'SH' },
    { quote: 'The remortgage alert saved us roughly £3,200 a year. We\'d completely lost track of when our fix ended.', name: 'Marcus K.', role: 'Terrace, Manchester', initials: 'MK' },
    { quote: 'Finally understand our service charge and when we need to extend the lease. It\'s not complicated — we just needed it explained clearly.', name: 'Priya C.', role: 'Leasehold flat, London', initials: 'PC' },
    { quote: 'Predicted our boiler was due for replacement before it failed. Sorted it in October and saved about £600 in emergency callout fees.', name: 'Tom R.', role: 'Victorian terrace, Bristol', initials: 'TR' },
  ]
  return (
    <section style={{ background: 'var(--slate-50)', padding: 'clamp(40px,6vw,72px) 0' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 clamp(16px,4vw,40px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span className="tag tag-slate" style={{ marginBottom: 12, display: 'inline-block' }}>Early access users</span>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 500, color: 'var(--slate-900)' }}>What homeowners are saying</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {testimonials.map((t, i) => (
            <div key={i} className="card">
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--slate-700)', lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>&ldquo;{t.quote}&rdquo;</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: 'var(--brand-800)', flexShrink: 0 }}>{t.initials}</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--slate-900)', margin: 0 }}>{t.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)', margin: 0 }}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  const plans = [
    {
      name: 'Starter', price: 'Free', period: 'forever', featured: false,
      features: ['Property value tracker', 'Document vault (5 files)', 'Basic maintenance calendar', 'EPC band display'],
    },
    {
      name: 'Homeowner Pro', price: '£9', period: 'per month', featured: true,
      features: ['Everything in Free', 'EPC upgrade planner + grants', 'AI maintenance predictions', 'Remortgage radar', 'Leasehold manager', 'Unlimited document vault', 'Priority support'],
    },
    {
      name: 'Portfolio', price: '£24', period: 'per month', featured: false,
      features: ['Up to 5 properties', 'BTL landlord tools', 'Tax year reporting', 'CSV data exports', 'Everything in Pro'],
    },
  ]
  return (
    <section id="pricing" style={{ background: '#fff', padding: 'clamp(40px,6vw,72px) 0' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 clamp(16px,4vw,40px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span className="tag tag-green" style={{ marginBottom: 12, display: 'inline-block' }}>Pricing</span>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 500, color: 'var(--slate-900)', marginBottom: 12 }}>Simple, honest pricing</h2>
          <p style={{ fontSize: 15, color: 'var(--slate-500)' }}>No hidden fees. Cancel any time.</p>
        </div>
        <div className="pp-grid-3">
          {plans.map((p, i) => (
            <div key={i} className="card" style={p.featured ? { border: '2px solid var(--brand-400)', position: 'relative' } : {}}>
              {p.featured && (
                <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: 'var(--brand-400)', color: '#fff', fontSize: 11, fontWeight: 500, padding: '3px 12px', borderRadius: 20 }}>Most popular</div>
              )}
              <p style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 6 }}>{p.name}</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 500, color: 'var(--slate-900)', margin: '0 0 2px' }}>{p.price}</p>
              <p style={{ fontSize: 12, color: 'var(--slate-400)', marginBottom: 20 }}>{p.period}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
                {p.features.map((f, j) => (
                  <li key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '5px 0', fontSize: 13, color: 'var(--slate-700)' }}>
                    <span style={{ color: 'var(--brand-400)', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <a href="#waitlist" className={p.featured ? 'btn-primary' : 'btn-ghost'} style={{ width: '100%', justifyContent: 'center', display: 'flex', fontSize: 14, padding: '10px 0' }}>
                {p.price === 'Free' ? 'Get started' : 'Start free trial'}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCTA({ onJoin }: { onJoin: (email: string) => void }) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) { onJoin(email); setSubmitted(true) }
  }
  return (
    <section id="waitlist" style={{ background: 'var(--slate-900)', padding: 'clamp(48px,8vw,80px) clamp(16px,4vw,40px)', textAlign: 'center' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 500, color: '#fff', marginBottom: 16 }}>
          Your home deserves better than a drawer full of paperwork.
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 32, lineHeight: 1.7 }}>
          Join 847 UK homeowners already on the waitlist. Free to start, no credit card needed.
        </p>
        {submitted ? (
          <p style={{ fontSize: 16, color: 'var(--brand-200)', fontWeight: 500 }}>You&apos;re on the list. We&apos;ll be in touch soon. ✓</p>
        ) : (
          <form onSubmit={handleSubmit} className="pp-final-cta-form">
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Your email address"
              style={{ flex: 1, height: 48, padding: '0 16px', fontSize: 15, border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontFamily: 'var(--font-body)', outline: 'none', minWidth: 0 }}
            />
            <button type="submit" className="btn-primary" style={{ height: 48 }}>Join waitlist</button>
          </form>
        )}
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>No newsletters. We email you once when your invite is ready.</p>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer style={{ background: 'var(--slate-900)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '24px clamp(16px,4vw,40px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>PropPilot</span>
      <div style={{ display: 'flex', gap: 24 }}>
        {['Privacy', 'Terms', 'Contact'].map(l => (
          <a key={l} href="#" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>{l}</a>
        ))}
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const handleJoin = async (email: string) => {
    // TODO: wire up to your email list (Mailchimp, Resend, etc.)
    console.log('Waitlist signup:', email)
  }

  return (
    <>
      <Nav />
      <main>
        <Hero onJoin={handleJoin} />
        <SocialProof />
        <Problems />
        <Features />
        <EPCCallout />
        <Testimonials />
        <Pricing />
        <FinalCTA onJoin={handleJoin} />
      </main>
      <Footer />
    </>
  )
}
