'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { isDemoEmail, requestPasswordReset } from '../lib/auth'

// ─── Form (needs Suspense for searchParams if ever used) ──────────────────────

function ForgotPasswordForm() {
  const [email,   setEmail]   = useState('')
  const [status,  setStatus]  = useState<'idle' | 'loading' | 'sent' | 'demo' | 'error'>('idle')
  const [resetUrl, setResetUrl] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return

    setStatus('loading')

    // Slight delay so it feels like a real network call
    setTimeout(() => {
      // Demo accounts can't be reset
      if (isDemoEmail(trimmed)) {
        setStatus('demo')
        return
      }

      const token = requestPasswordReset(trimmed)
      if (token) {
        // Build the reset URL (in production this would be emailed)
        const url = `${window.location.origin}/reset-password?token=${token}`
        setResetUrl(url)
        setStatus('sent')
      } else {
        // Email not found — show generic message (don't reveal whether account exists)
        setStatus('sent')
      }
    }, 800)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 44, padding: '0 14px', fontSize: 14,
    border: '1.5px solid #e2ddd6', borderRadius: 12,
    background: '#fff', color: '#333', outline: 'none',
    fontFamily: 'var(--font-body)', transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f8f7f4',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', marginBottom: 36 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500, color: '#1a1917' }}>
          Prop<span style={{ color: '#1D9E75' }}>Pilot</span>
        </span>
      </Link>

      <div style={{
        width: '100%', maxWidth: 480,
        background: '#fff', border: '1px solid #e2ddd6',
        borderRadius: 16, padding: '36px 32px',
      }}>

        {/* ── Idle / loading: show the form ── */}
        {(status === 'idle' || status === 'loading') && (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: '#1a1917', marginBottom: 6 }}>
              Reset your password
            </h1>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 28 }}>
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#333', display: 'block', marginBottom: 6 }}>
                  Email address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                  onFocus={e  => (e.currentTarget.style.borderColor = '#1D9E75')}
                  onBlur={e   => (e.currentTarget.style.borderColor = '#e2ddd6')}
                />
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                style={{
                  width: '100%', height: 44, background: '#1D9E75', color: '#fff',
                  border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500,
                  cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                  opacity: status === 'loading' ? 0.7 : 1, fontFamily: 'var(--font-body)',
                }}
              >
                {status === 'loading' ? 'Sending…' : 'Send reset link →'}
              </button>
            </form>
          </>
        )}

        {/* ── Sent: generic confirmation (also shown when email not found) ── */}
        {status === 'sent' && (
          <>
            <div style={{ fontSize: 36, marginBottom: 16 }}>📬</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: '#1a1917', marginBottom: 10 }}>
              Check your inbox
            </h2>
            <p style={{ fontSize: 14, color: '#5e5a52', lineHeight: 1.7, marginBottom: 20 }}>
              If an account exists for <strong>{email}</strong>, a password reset link has been sent. Check your spam folder if it doesn&apos;t arrive within a few minutes.
            </p>

            {/* Dev / demo helper: show reset link directly since there's no email service */}
            {resetUrl && (
              <div style={{
                background: '#fffbeb', border: '1px solid #fcd34d',
                borderRadius: 10, padding: '14px 16px', marginBottom: 20,
              }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#92400e', margin: '0 0 8px' }}>
                  ℹ️ No email service in this environment
                </p>
                <p style={{ fontSize: 12, color: '#78350f', marginBottom: 10, lineHeight: 1.6 }}>
                  In production this link would be emailed. For now, use it directly:
                </p>
                <Link
                  href={resetUrl}
                  style={{
                    display: 'block', fontSize: 13, fontWeight: 500,
                    color: '#1D9E75', wordBreak: 'break-all', textDecoration: 'none',
                    background: '#f0fdf4', border: '1px solid #86efac',
                    borderRadius: 8, padding: '8px 12px',
                  }}
                >
                  {resetUrl}
                </Link>
              </div>
            )}

            <Link
              href="/login"
              style={{
                display: 'inline-block', fontSize: 13, fontWeight: 500,
                color: '#1D9E75', textDecoration: 'none',
              }}
            >
              ← Back to sign in
            </Link>
          </>
        )}

        {/* ── Demo account notice ── */}
        {status === 'demo' && (
          <>
            <div style={{ fontSize: 36, marginBottom: 16 }}>🔒</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: '#1a1917', marginBottom: 10 }}>
              Demo account
            </h2>
            <p style={{ fontSize: 14, color: '#5e5a52', lineHeight: 1.7, marginBottom: 8 }}>
              <strong>{email}</strong> is a demo account. Its password cannot be changed.
            </p>
            <div style={{
              background: '#f0fdf4', border: '1px solid #86efac',
              borderRadius: 10, padding: '12px 16px', marginBottom: 20,
            }}>
              <p style={{ fontSize: 13, color: '#14532d', margin: 0 }}>
                Demo password: <strong style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}>PropDemo2024</strong>
              </p>
            </div>
            <Link
              href="/login"
              style={{
                display: 'inline-block', fontSize: 13, fontWeight: 500,
                color: '#1D9E75', textDecoration: 'none',
              }}
            >
              ← Back to sign in
            </Link>
          </>
        )}

      </div>

      <p style={{ fontSize: 13, color: '#999', marginTop: 20 }}>
        Remember your password?{' '}
        <Link href="/login" style={{ color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}>
          Sign in →
        </Link>
      </p>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  )
}
