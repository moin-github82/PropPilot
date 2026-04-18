'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUser, logout, type User } from '../../lib/auth'
import { NavBar } from '../../components/NavBar'
import { Footer } from '../../components/Footer'

// ─── Quick-access tools ───────────────────────────────────────────────────────

const BUYER_TOOLS = [
  {
    href:   '/tools/property-report',
    icon:   '🔍',
    title:  'Property Report',
    desc:   'Run automated flood, EPC, crime & broadband checks on any address.',
    badge:  null,
  },
  {
    href:   '/tools/checklist',
    icon:   '🧾',
    title:  'Buying Checklists',
    desc:   'Interactive checklists for FTB, standard buyers, and BTL investors.',
    badge:  null,
  },
  {
    href:   '/homebuyer',
    icon:   '🏠',
    title:  'Homebuyer Check',
    desc:   'Full automated due diligence on any UK address in seconds.',
    badge:  null,
  },
  {
    href:   '/tools/stamp-duty',
    icon:   '🏷️',
    title:  'Stamp Duty',
    desc:   'Calculate your SDLT bill including first-time buyer relief.',
    badge:  null,
  },
  {
    href:   '/tools/lease-extension',
    icon:   '📋',
    title:  'Lease Extension',
    desc:   'Estimate your lease extension premium under the 1993 Act.',
    badge:  null,
  },
]

const PREMIUM_SERVICES = [
  { icon: '⚖️', title: 'Title Register & Legal Checks', cost: 'from £800',  desc: 'Solicitor review of title, covenants & searches' },
  { icon: '🏗️', title: 'Structural Survey (RICS)',      cost: 'from £500',  desc: 'Full Level 2 or Level 3 building survey' },
  { icon: '🔥', title: 'Gas Safety Certificate',        cost: 'from £60',   desc: 'CP12 by Gas Safe registered engineer' },
  { icon: '⚡', title: 'EICR Electrical Report',        cost: 'from £150',  desc: 'Full electrical installation condition report' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function BuyerDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const u = getUser()
    if (!u) {
      router.replace('/login')
      return
    }
    // If owner logs in they shouldn't be here — redirect
    if (u.role === 'owner') {
      router.replace('/dashboard')
      return
    }
    setUser(u)
  }, [router])

  const onSignOut = () => {
    logout()
    router.push('/')
  }

  if (!user) return null

  const isPro        = user.plan === 'pro' || user.plan === 'enterprise'
  const isEnterprise = user.plan === 'enterprise'

  const card: React.CSSProperties = {
    background: '#fff', border: '1px solid #e2ddd6', borderRadius: 14, padding: '20px 22px',
  }

  const planColor = isPro
    ? { bg: '#dcfce7', text: '#15803d', border: '#86efac' }
    : { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' }

  const BUYER_NAV = [
    { label: 'Dashboard',       href: '/dashboard/buyer' },
    { label: 'Property Report', href: '/tools/property-report' },
    { label: 'Checklists',      href: '/tools/checklist' },
    { label: 'Stamp Duty',      href: '/tools/stamp-duty' },
    { label: 'Lease Extension', href: '/tools/lease-extension' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', display: 'flex', flexDirection: 'column' }}>
      <NavBar
        logoHref="/dashboard/buyer"
        rightSlot={
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {BUYER_NAV.map(l => (
              <a key={l.href} href={l.href}
                style={{ fontSize: 13, color: '#5e5a52', padding: '6px 10px', textDecoration: 'none', borderRadius: 8 }}
              >
                {l.label}
              </a>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.04em', textTransform: 'uppercase', background: planColor.bg, color: planColor.text, border: `1px solid ${planColor.border}` }}>
                {user.plan}
              </span>
              <span style={{ fontSize: 13, color: '#5e5a52' }}>{user.name.split(' ')[0]}</span>
              <button onClick={onSignOut} style={{ fontSize: 13, color: '#5e5a52', background: 'none', border: '1px solid #e2ddd6', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Sign out
              </button>
            </div>
          </div>
        }
        mobileItems={[
          ...BUYER_NAV.map(l => ({ label: l.label, href: l.href })),
          { label: 'Sign out', onClick: onSignOut },
        ]}
      />

      <main style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(32px,5vw,48px) clamp(16px,4vw,40px) 80px' }}>

        {/* Welcome banner */}
        <div style={{ marginBottom: 32 }}>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9e998f', display: 'block', marginBottom: 8 }}>
            HomeBuyer dashboard
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,3vw,32px)', fontWeight: 500, color: '#1a1917', margin: '0 0 8px' }}>
            Welcome back, {user.name.split(' ')[0]} 👋
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, background: isPro ? '#f0fdf4' : '#f8f7f4', color: isPro ? '#14532d' : '#9e998f', border: `1px solid ${isPro ? '#86efac' : '#e2ddd6'}`, borderRadius: 20, padding: '2px 10px' }}>
              {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} plan
            </span>
            {!isPro && (
              <Link href="/pricing" style={{ fontSize: 12, color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}>
                Upgrade to Pro →
              </Link>
            )}
          </div>
        </div>

        {/* Upgrade nudge — only for free users */}
        {!isPro && (
          <div style={{ background: 'linear-gradient(135deg, #1D9E75 0%, #15805e 100%)', borderRadius: 14, padding: '20px 24px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>Unlock unlimited property reports</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: 0 }}>Pro plan: unlimited reports, PDF downloads, EPC lookup & 10% off professional services</p>
            </div>
            <Link href="/pricing?role=buyer" style={{ height: 38, padding: '0 18px', fontSize: 13, fontWeight: 600, background: '#fff', color: '#1D9E75', borderRadius: 8, textDecoration: 'none', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
              See Pro plans →
            </Link>
          </div>
        )}

        {/* Quick tools grid */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, color: '#1a1917', margin: '0 0 14px' }}>Your tools</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))', gap: 12 }}>
            {BUYER_TOOLS.map(tool => (
              <Link key={tool.href} href={tool.href} style={{ textDecoration: 'none' }}>
                <div style={{ ...card, cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s', height: '100%' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#1D9E75' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.borderColor = '#e2ddd6' }}
                >
                  <span style={{ fontSize: 24, display: 'block', marginBottom: 10 }}>{tool.icon}</span>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1917', margin: '0 0 4px' }}>{tool.title}</p>
                  <p style={{ fontSize: 12, color: '#5e5a52', margin: 0, lineHeight: 1.5 }}>{tool.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Professional services */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, color: '#1a1917', margin: 0 }}>Professional services</h2>
            {!isPro && <Link href="/pricing?role=buyer" style={{ fontSize: 12, color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}>Upgrade for 10% off →</Link>}
          </div>
          <div style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 14, overflow: 'hidden' }}>
            {PREMIUM_SERVICES.map((svc, idx) => (
              <div key={svc.title} style={{ padding: '16px 22px', borderBottom: idx < PREMIUM_SERVICES.length - 1 ? '1px solid #f0ede8' : 'none', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{svc.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1917', margin: '0 0 2px' }}>{svc.title}</p>
                  <p style={{ fontSize: 12, color: '#9e998f', margin: 0 }}>{svc.desc}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1917', margin: '0 0 6px' }}>{svc.cost}</p>
                  <Link
                    href={`/tools/property-report?service=${encodeURIComponent(svc.title)}`}
                    style={{ fontSize: 12, fontWeight: 600, background: isPro ? '#1D9E75' : '#f8f7f4', color: isPro ? '#fff' : '#9e998f', border: `1px solid ${isPro ? '#1D9E75' : '#e2ddd6'}`, borderRadius: 6, padding: '5px 12px', textDecoration: 'none', display: 'inline-block' }}
                  >
                    {isPro ? 'Get quote →' : '🔒 Pro only'}
                  </Link>
                </div>
                {isPro && (
                  <span style={{ fontSize: 11, background: '#f0fdf4', color: '#14532d', border: '1px solid #86efac', borderRadius: 20, padding: '1px 8px', whiteSpace: 'nowrap' }}>10% off</span>
                )}
              </div>
            ))}
          </div>
          {isEnterprise && (
            <p style={{ fontSize: 12, color: '#9e998f', marginTop: 10 }}>
              Enterprise plan: volume discounts available. Contact your account manager for custom pricing.
            </p>
          )}
        </div>

        {/* Account info */}
        <div style={{ ...card, marginTop: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1917', margin: '0 0 12px' }}>Account</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 8 }}>
            {[
              { label: 'Name',  value: user.name },
              { label: 'Email', value: user.email },
              { label: 'Role',  value: 'HomeBuyer' },
              { label: 'Plan',  value: user.plan.charAt(0).toUpperCase() + user.plan.slice(1) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontSize: 11, color: '#9e998f', margin: '0 0 2px' }}>{label}</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1917', margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <Link href="/pricing" style={{ fontSize: 13, color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}>Manage plan →</Link>
            <button onClick={onSignOut} style={{ fontSize: 13, color: '#9e998f', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0 }}>Sign out</button>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  )
}
