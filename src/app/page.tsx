'use client'

import { useState } from 'react'
import Link from 'next/link'
import { NavBar } from './components/NavBar'

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <NavBar
      rightSlot={<>
        <Link href="#for-buyers"  style={{ fontSize: 14, color: 'var(--slate-600)', textDecoration: 'none' }}>HomeBuyers</Link>
        <Link href="#for-owners"  style={{ fontSize: 14, color: 'var(--slate-600)', textDecoration: 'none' }}>HomeOwners</Link>
        <Link href="/pricing"     style={{ fontSize: 14, color: 'var(--slate-600)', textDecoration: 'none' }}>Pricing</Link>
        <Link href="/tools"       style={{ fontSize: 14, color: 'var(--slate-600)', textDecoration: 'none' }}>Free tools</Link>
        <Link href="/login"       style={{ fontSize: 14, color: 'var(--slate-600)', textDecoration: 'none', padding: '6px 14px' }}>Sign in</Link>
        <Link href="/signup"      style={{ fontSize: 14, fontWeight: 600, color: '#fff', background: '#1D9E75', textDecoration: 'none', padding: '8px 18px', borderRadius: 8 }}>Get started free</Link>
      </>}
      mobileItems={[
        { label: 'HomeBuyers',       href: '#for-buyers' },
        { label: 'HomeOwners',       href: '#for-owners' },
        { label: 'Pricing',          href: '/pricing'    },
        { label: 'Free tools',       href: '/tools'      },
        { label: 'Sign in',          href: '/login'      },
        { label: 'Get started free', href: '/signup'     },
      ]}
    />
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section style={{
      maxWidth: 900, margin: '0 auto',
      padding: 'clamp(56px,8vw,96px) clamp(16px,4vw,40px) clamp(40px,6vw,64px)',
      textAlign: 'center',
    }}>
      <div className="fade-up">
        <span className="tag tag-green" style={{ marginBottom: 24, display: 'inline-block' }}>
          Now in early access · 847 people on the waitlist
        </span>
      </div>
      <h1 className="fade-up-d1" style={{ fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 500, color: 'var(--slate-900)', marginBottom: 20, lineHeight: 1.15 }}>
        Whether you&apos;re buying or you already own —<br />
        <em style={{ fontStyle: 'italic', color: '#1D9E75' }}>PropHealth has you covered.</em>
      </h1>
      <p className="fade-up-d2" style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'var(--slate-600)', lineHeight: 1.7, maxWidth: 580, margin: '0 auto 40px' }}>
        Free tools and professional services for every stage of your property journey — from the first viewing to the decade you spend living there.
      </p>
      <div className="fade-up-d3" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/signup?role=buyer" style={{ height: 50, padding: '0 24px', fontSize: 15, fontWeight: 600, background: '#1D9E75', color: '#fff', borderRadius: 10, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          🏡 I&apos;m buying a home →
        </Link>
        <Link href="/signup?role=owner" style={{ height: 50, padding: '0 24px', fontSize: 15, fontWeight: 600, background: '#fff', color: '#1a1917', border: '1.5px solid #e2ddd6', borderRadius: 10, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          🏠 I own a home →
        </Link>
      </div>
      <p className="fade-up-d4" style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 16 }}>
        Free to start. No credit card needed.
      </p>
    </section>
  )
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function Stats() {
  const stats = [
    { n: '4M+',    l: 'UK properties transacted each year' },
    { n: '19M',    l: 'UK homes below EPC Band C' },
    { n: '£2,500', l: 'Average annual home maintenance spend' },
    { n: '1.6M',   l: 'Fixed-rate mortgage deals expire yearly' },
  ]
  return (
    <div style={{ background: '#fff', borderTop: '1px solid #e2ddd6', borderBottom: '1px solid #e2ddd6' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 'clamp(20px,3vw,32px) clamp(16px,4vw,40px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 0 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '16px 8px', borderRight: i < stats.length - 1 ? '1px solid #e2ddd6' : 'none' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 500, color: '#1D9E75', margin: '0 0 4px' }}>{s.n}</p>
            <p style={{ fontSize: 12, color: 'var(--slate-500)', margin: 0 }}>{s.l}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── HomeBuyer section ────────────────────────────────────────────────────────

function ForBuyers() {
  const features = [
    { icon: '🔍', title: 'Automated property reports', body: 'Enter any UK postcode and get an instant report covering flood risk (Environment Agency), EPC rating, crime statistics (police.uk), broadband speeds (Ofcom), and council tax — in one place, in seconds.', link: '/tools/property-report', linkText: 'Run a free report' },
    { icon: '🧾', title: 'Property buying checklists', body: 'Interactive checklists for every buyer type — a full UK buying guide, a simplified first-time buyer flow, a buy-to-let investor checklist, and a risk scoring matrix to compare properties side by side.', link: '/tools/checklist', linkText: 'Open the checklists' },
    { icon: '🏷️', title: 'Stamp Duty & Lease Extension calculators', body: 'Know exactly what SDLT you owe before you offer — including first-time buyer relief and the 3% additional property surcharge. Plus a lease extension premium estimator using the 1993 Act formula.', link: '/tools/stamp-duty', linkText: 'Calculate stamp duty' },
    { icon: '⚖️', title: 'Professional services — vetted & booked', body: 'Need a solicitor for title checks, a RICS surveyor, a Gas Safe engineer for a CP12, or an EICR electrical report? We connect Pro members with vetted local professionals — with 10% off every booking.', link: '/pricing?role=buyer', linkText: 'See buyer plans' },
  ]

  return (
    <section id="for-buyers" style={{ padding: 'clamp(48px,6vw,80px) 0' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 clamp(16px,4vw,40px)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ height: 2, flex: 1, background: '#e2ddd6' }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1D9E75', whiteSpace: 'nowrap' }}>For HomeBuyers 🏡</span>
          <div style={{ height: 2, flex: 1, background: '#e2ddd6' }} />
        </div>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,3vw,38px)', fontWeight: 500, color: '#1a1917', marginBottom: 12 }}>
            Buy with confidence, not guesswork
          </h2>
          <p style={{ fontSize: 16, color: 'var(--slate-500)', maxWidth: 540, margin: '0 auto' }}>
            Automated due diligence, professional checklists, and vetted expert services — everything you need before you exchange.
          </p>
        </div>

        {/* Feature grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))', gap: 16, marginBottom: 36 }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 14, padding: '24px' }}>
              <span style={{ fontSize: 28, display: 'block', marginBottom: 12 }}>{f.icon}</span>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, color: '#1a1917', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#5e5a52', lineHeight: 1.7, margin: '0 0 14px' }}>{f.body}</p>
              <Link href={f.link} style={{ fontSize: 13, fontWeight: 600, color: '#1D9E75', textDecoration: 'none' }}>{f.linkText} →</Link>
            </div>
          ))}
        </div>

        {/* Professional services strip */}
        <div style={{ background: '#1a1917', borderRadius: 16, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>Need a professional? We&apos;ll find you one.</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              ⚖️ Solicitor &nbsp;·&nbsp; 🏗️ RICS Surveyor &nbsp;·&nbsp; 🔥 Gas Safety &nbsp;·&nbsp; ⚡ Electrician (EICR)
            </p>
          </div>
          <Link href="/signup?role=buyer&plan=pro" style={{ height: 40, padding: '0 18px', fontSize: 13, fontWeight: 600, background: '#1D9E75', color: '#fff', borderRadius: 8, textDecoration: 'none', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            Join Pro — 10% off all bookings
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── HomeOwner section ────────────────────────────────────────────────────────

function ForOwners() {
  const features = [
    { icon: '📊', title: 'Property dashboard', body: 'Your home\'s current estimated value, equity position, EPC rating, and mortgage details in one place. Updated with Land Registry data and linked to the EPC register.', link: '/dashboard', linkText: 'View the dashboard' },
    { icon: '🔧', title: 'Maintenance calendar', body: 'Never get caught by an unexpected repair bill. Track your boiler service, gas safety check, gutter clean, and more — with reminders before they become emergencies.', link: '/tools/maintenance', linkText: 'Set up your calendar' },
    { icon: '⚡', title: 'EPC upgrade planner', body: 'See your current EPC band, what improvements are recommended, and every grant you might qualify for — including ECO4 and the Boiler Upgrade Scheme. Know the cost before you commit.', link: '/dashboard/epc-upgrade', linkText: 'Check my EPC' },
    { icon: '🔒', title: 'Remortgage radar', body: 'Tell us when your fixed rate ends. We alert you at the right moment to remortgage — typically 6 months before expiry. A 2-minute setup that saves thousands.', link: '/dashboard', linkText: 'Set a reminder' },
    { icon: '📁', title: 'Document vault', body: 'Store your EPC certificate, survey report, gas safety record, EICR, planning approvals, and warranties in one secure, searchable place — accessible anywhere.', link: '/tools/documents', linkText: 'Open the vault' },
    { icon: '📋', title: 'Compliance tools for landlords', body: 'Track gas safety, EICR, EPC, and selective licensing deadlines across your portfolio. Get alerts before certificates expire. Keep tenants safe and avoid fines.', link: '/pricing?role=owner', linkText: 'See owner plans' },
  ]

  return (
    <section id="for-owners" style={{ background: '#fff', padding: 'clamp(48px,6vw,80px) 0' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 clamp(16px,4vw,40px)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ height: 2, flex: 1, background: '#e2ddd6' }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1D9E75', whiteSpace: 'nowrap' }}>For HomeOwners 🏠</span>
          <div style={{ height: 2, flex: 1, background: '#e2ddd6' }} />
        </div>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,3vw,38px)', fontWeight: 500, color: '#1a1917', marginBottom: 12 }}>
            Your home is your biggest asset. Run it like one.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--slate-500)', maxWidth: 540, margin: '0 auto' }}>
            From maintenance reminders to remortgage alerts, EPC upgrades to document storage — everything your home needs, in one place.
          </p>
        </div>

        {/* Feature grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 16, marginBottom: 36 }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: '#f8f7f4', border: '1px solid #e2ddd6', borderRadius: 14, padding: '22px' }}>
              <span style={{ fontSize: 24, display: 'block', marginBottom: 10 }}>{f.icon}</span>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, color: '#1a1917', marginBottom: 6 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: '#5e5a52', lineHeight: 1.7, margin: '0 0 12px' }}>{f.body}</p>
              <Link href={f.link} style={{ fontSize: 13, fontWeight: 600, color: '#1D9E75', textDecoration: 'none' }}>{f.linkText} →</Link>
            </div>
          ))}
        </div>

        {/* EPC callout */}
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 14, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1D9E75', margin: '0 0 6px' }}>EPC deadline — 2030</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#14532d', margin: '0 0 4px' }}>61% of UK homes need to upgrade before 2030</p>
            <p style={{ fontSize: 13, color: '#166534', margin: 0 }}>Lenders are already factoring EPC into mortgage offers. Get your roadmap now.</p>
          </div>
          <Link href="/signup?role=owner" style={{ height: 40, padding: '0 18px', fontSize: 13, fontWeight: 600, background: '#1D9E75', color: '#fff', borderRadius: 8, textDecoration: 'none', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            Check my EPC band →
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function Testimonials() {
  const testimonials = [
    { quote: 'The property report flagged a flood zone I had no idea about. Saved me from making a very expensive mistake.', name: 'James R.', role: 'First-time buyer, Oxford', type: 'buyer' },
    { quote: 'Found out I qualify for ECO4 insulation worth £8,000. Took 3 minutes. I\'d been ignoring the EPC letter for two years.', name: 'Sarah H.', role: 'Semi-detached, Leeds', type: 'owner' },
    { quote: 'The checklist made me realise I hadn\'t checked the lease length. It was 74 years — I renegotiated before exchange.', name: 'Priya C.', role: 'Leasehold buyer, London', type: 'buyer' },
    { quote: 'The remortgage alert saved us roughly £3,200 a year. We\'d completely lost track of when our fix ended.', name: 'Marcus K.', role: 'Homeowner, Manchester', type: 'owner' },
  ]
  return (
    <section style={{ background: 'var(--slate-50)', padding: 'clamp(40px,6vw,72px) 0' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 clamp(16px,4vw,40px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <span className="tag tag-slate" style={{ marginBottom: 12, display: 'inline-block' }}>Real users</span>
          <h2 style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 500, color: 'var(--slate-900)' }}>What buyers and owners are saying</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {testimonials.map((t, i) => (
            <div key={i} className="card">
              <span style={{ fontSize: 11, fontWeight: 600, background: t.type === 'buyer' ? '#f0fdf4' : '#f0f9ff', color: t.type === 'buyer' ? '#14532d' : '#0c4a6e', borderRadius: 20, padding: '2px 8px', display: 'inline-block', marginBottom: 12 }}>
                {t.type === 'buyer' ? '🏡 HomeBuyer' : '🏠 HomeOwner'}
              </span>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--slate-700)', lineHeight: 1.7, marginBottom: 16, fontStyle: 'italic' }}>&ldquo;{t.quote}&rdquo;</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--slate-900)', margin: '0 0 2px' }}>{t.name}</p>
              <p style={{ fontSize: 12, color: 'var(--slate-500)', margin: 0 }}>{t.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing preview ──────────────────────────────────────────────────────────

function PricingPreview() {
  const cards = [
    { role: '🏡 HomeBuyer', plans: 'Free · Pro £19/mo · Enterprise £79/mo', href: '/pricing?role=buyer', color: '#14532d', bg: '#f0fdf4', border: '#86efac', highlights: ['3 free property reports/month', 'Unlimited on Pro', 'Professional services from Pro'] },
    { role: '🏠 HomeOwner', plans: 'Free · Pro £9/mo · Enterprise £29/mo', href: '/pricing?role=owner', color: '#0c4a6e', bg: '#f0f9ff', border: '#7dd3fc', highlights: ['Maintenance calendar & doc vault', 'Full dashboard on Pro', 'Multi-property on Enterprise'] },
  ]
  return (
    <section style={{ padding: 'clamp(48px,6vw,72px) 0' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 clamp(16px,4vw,40px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <span className="tag tag-green" style={{ marginBottom: 12, display: 'inline-block' }}>Pricing</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,3vw,32px)', fontWeight: 500, color: '#1a1917', margin: '0 0 10px' }}>Two plans, built for two journeys</h2>
          <p style={{ fontSize: 15, color: '#5e5a52', margin: 0 }}>Free to start. Upgrade when you need more.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {cards.map(c => (
            <div key={c.role} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: '24px 22px' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: c.color, margin: '0 0 4px' }}>{c.role}</p>
              <p style={{ fontSize: 12, color: c.color, opacity: 0.8, margin: '0 0 16px' }}>{c.plans}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {c.highlights.map(h => (
                  <li key={h} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#1a1917' }}>
                    <span style={{ color: '#1D9E75', fontWeight: 700, flexShrink: 0 }}>✓</span>{h}
                  </li>
                ))}
              </ul>
              <Link href={c.href} style={{ display: 'block', textAlign: 'center', padding: '10px 0', fontSize: 13, fontWeight: 600, background: c.color, color: '#fff', borderRadius: 8, textDecoration: 'none' }}>
                See plans →
              </Link>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#9e998f' }}>
          All plans start free. <Link href="/pricing" style={{ color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}>Compare all plans →</Link>
        </p>
      </div>
    </section>
  )
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTA() {
  const [email,     setEmail]     = useState('')
  const [submitted, setSubmitted] = useState(false)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) { console.log('Waitlist:', email); setSubmitted(true) }
  }
  return (
    <section id="waitlist" style={{ background: 'var(--slate-900)', padding: 'clamp(48px,8vw,80px) clamp(16px,4vw,40px)', textAlign: 'center' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 500, color: '#fff', marginBottom: 16 }}>
          Your property journey deserves better tools.
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 32, lineHeight: 1.7 }}>
          Join 847 buyers and owners already on the waitlist. Free to start, no credit card needed.
        </p>
        {submitted ? (
          <p style={{ fontSize: 16, color: '#6ee7b7', fontWeight: 500 }}>You&apos;re on the list. We&apos;ll be in touch soon. ✓</p>
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
        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup?role=buyer" style={{ fontSize: 13, fontWeight: 600, color: '#6ee7b7', textDecoration: 'none' }}>🏡 Start as a buyer →</Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <Link href="/signup?role=owner" style={{ fontSize: 13, fontWeight: 600, color: '#93c5fd', textDecoration: 'none' }}>🏠 Start as an owner →</Link>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: '16px 0 0' }}>No newsletters. We email you once when your invite is ready.</p>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ background: 'var(--slate-900)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '24px clamp(16px,4vw,40px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>PropHealth</span>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <Link href="/pricing" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Pricing</Link>
        <Link href="/tools"   style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Free tools</Link>
        {['Privacy', 'Terms', 'Contact'].map(l => (
          <a key={l} href="#" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>{l}</a>
        ))}
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Stats />
        <ForBuyers />
        <ForOwners />
        <Testimonials />
        <PricingPreview />
        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}
