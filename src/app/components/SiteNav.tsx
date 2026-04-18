'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { NavBar } from './NavBar'
import { getUser, logout, type User } from '../lib/auth'

// ─── Role-specific nav link sets ─────────────────────────────────────────────

const BUYER_LINKS = [
  { label: 'Dashboard',        href: '/dashboard/buyer' },
  { label: 'Property Report',  href: '/tools/property-report' },
  { label: 'Checklists',       href: '/tools/checklist' },
  { label: 'Stamp Duty',       href: '/tools/stamp-duty' },
  { label: 'Lease Extension',  href: '/tools/lease-extension' },
]

const OWNER_LINKS = [
  { label: 'Dashboard',        href: '/dashboard' },
  { label: 'Property Report',  href: '/tools/property-report' },
  { label: 'Maintenance',      href: '/tools/maintenance' },
  { label: 'Documents',        href: '/tools/documents' },
  { label: 'EPC Upgrade',      href: '/dashboard/epc-upgrade' },
]

const PUBLIC_LINKS = [
  { label: 'Tools',    href: '/tools' },
  { label: 'Pricing',  href: '/pricing' },
]

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * SiteNav — drop-in replacement for NavBar on all authenticated pages.
 * Reads auth state from localStorage, renders role-appropriate links,
 * and handles sign-out.
 *
 * Usage (no props required):
 *   <SiteNav />
 *
 * Optional: pass activePath to highlight the current page.
 */
export function SiteNav({ activePath }: { activePath?: string }) {
  const router   = useRouter()
  const pathname = usePathname()
  const active   = activePath ?? pathname

  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setUser(getUser())
    setReady(true)
  }, [])

  const handleSignOut = () => {
    logout()
    router.push('/')
  }

  const links = user?.role === 'buyer' ? BUYER_LINKS
              : user?.role === 'owner' ? OWNER_LINKS
              : PUBLIC_LINKS

  const planBadge = user ? (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: user.plan === 'free' ? '#f3f4f6' : '#dcfce7',
      color:      user.plan === 'free' ? '#6b7280' : '#15803d',
      border:     user.plan === 'free' ? '1px solid #e5e7eb' : '1px solid #86efac',
      letterSpacing: '0.04em', textTransform: 'uppercase' as const,
    }}>
      {user.plan}
    </span>
  ) : null

  const linkStyle = (href: string): React.CSSProperties => ({
    fontSize: 13,
    fontWeight: active === href ? 600 : 400,
    color: active === href ? '#1D9E75' : '#5e5a52',
    textDecoration: 'none',
    padding: '6px 10px',
    borderRadius: 8,
    background: active === href ? '#f0fdf4' : 'transparent',
    transition: 'background 0.12s',
  })

  if (!ready) {
    // Render a minimal nav shell while hydrating to avoid layout shift
    return (
      <NavBar
        rightSlot={<div style={{ width: 200 }} />}
        mobileItems={[]}
      />
    )
  }

  return (
    <NavBar
      logoHref={user ? (user.role === 'buyer' ? '/dashboard/buyer' : '/dashboard') : '/'}
      rightSlot={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {links.map(l => (
            <Link key={l.href} href={l.href} style={linkStyle(l.href)}>
              {l.label}
            </Link>
          ))}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
              {planBadge}
              <span style={{ fontSize: 13, color: '#9e998f' }}>
                {user.name.split(' ')[0]}
              </span>
              <button
                onClick={handleSignOut}
                style={{
                  fontSize: 13, color: '#5e5a52', background: 'none',
                  border: '1px solid #e2ddd6', borderRadius: 8, padding: '5px 12px',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
              <Link href="/login" style={{ fontSize: 13, color: '#1D9E75', fontWeight: 500, textDecoration: 'none', padding: '6px 12px' }}>
                Sign in
              </Link>
              <Link href="/signup" style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: '#1D9E75', textDecoration: 'none', padding: '7px 14px', borderRadius: 8 }}>
                Sign up free
              </Link>
            </div>
          )}
        </div>
      }
      mobileItems={[
        ...links.map(l => ({ label: l.label, href: l.href })),
        ...(user
          ? [{ label: `Sign out (${user.name.split(' ')[0]})`, onClick: handleSignOut }]
          : [{ label: 'Sign in', href: '/login' }, { label: 'Sign up', href: '/signup' }]
        ),
      ]}
    />
  )
}
