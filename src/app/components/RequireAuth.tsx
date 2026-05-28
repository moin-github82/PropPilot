'use client'

/**
 * RequireAuth — client-side guard for pages that need a plan check.
 *
 * The middleware already enforces login (pp_session cookie).
 * This component handles the finer-grained plan check that middleware
 * can't do (plan is stored in localStorage, not in a cookie).
 *
 * Usage:
 *   <RequireAuth requirePlan>
 *     <YourPageContent />
 *   </RequireAuth>
 *
 * Props:
 *   requirePlan  — if true, user must have plan = 'pro' | 'enterprise'
 *   toolName     — display name shown in the upgrade prompt
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUser, type User } from '../lib/auth'

interface RequireAuthProps {
  children: React.ReactNode
  requirePlan?: boolean
  toolName?: string
}

export function RequireAuth({ children, requirePlan = false, toolName = 'this tool' }: RequireAuthProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null | undefined>(undefined) // undefined = loading

  useEffect(() => {
    const u = getUser()
    if (!u) {
      // Should not normally happen (middleware handles it), but guard anyway
      router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    setUser(u)
  }, [router])

  // Still checking auth
  if (user === undefined) return null

  // Not logged in (in case middleware is bypassed)
  if (!user) return null

  // Plan check
  if (requirePlan && user.plan === 'free') {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{
          maxWidth: 420, textAlign: 'center',
          background: '#fff', border: '1px solid #e2ddd6',
          borderRadius: 20, padding: '40px 36px',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500,
            color: '#1a1917', marginBottom: 10,
          }}>
            Pro plan required
          </h2>
          <p style={{ fontSize: 14, color: '#5e5a52', lineHeight: 1.7, marginBottom: 28 }}>
            <strong>{toolName}</strong> is available on the Pro plan.
            Upgrade to unlock this and all other Pro features.
          </p>
          <Link
            href="/pricing"
            style={{
              display: 'inline-block', fontSize: 14, fontWeight: 600,
              color: '#fff', background: '#1D9E75', textDecoration: 'none',
              padding: '10px 24px', borderRadius: 12,
            }}
          >
            View plans &amp; upgrade →
          </Link>
          <p style={{ fontSize: 12, color: '#9e998f', marginTop: 16 }}>
            Already upgraded?{' '}
            <button
              onClick={() => window.location.reload()}
              style={{ background: 'none', border: 'none', color: '#1D9E75', cursor: 'pointer', fontSize: 12, padding: 0 }}
            >
              Refresh the page
            </button>
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
