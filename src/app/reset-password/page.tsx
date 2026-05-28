'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { isValidResetToken, resetPassword } from '../lib/auth'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token        = searchParams.get('token') ?? ''

  const [tokenValid,  setTokenValid]  = useState<boolean | null>(null) // null = checking
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [error,       setError]       = useState('')
  const [status,      setStatus]      = useState<'idle' | 'loading' | 'done'>('idle')

  // Validate the token on mount (client-side only — token is in localStorage)
  useEffect(() => {
    if (!token) { setTokenValid(false); return }
    setTokenValid(isValidResetToken(token))
  }, [token])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setStatus('loading')
    const ok = resetPassword(token, password)
    if (ok) {
      setStatus('done')
    } else {
      setStatus('idle')
      setError('This reset link has expired or is invalid. Please request a new one.')
    }
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
          Prop<span style={{ color: '#1D9E75' }}>Health</span>
        </span>
      </Link>

      <div style={{
        width: '100%', maxWidth: 480,
        background: '#fff', border: '1px solid #e2ddd6',
        borderRadius: 16, padding: '36px 32px',
      }}>

        {/* ── Checking token ── */}
        {tokenValid === null && (
          <p style={{ fontSize: 14, color: '#9e998f', textAlign: 'center' }}>Validating reset link…</p>
        )}

        {/* ── Invalid / expired token ── */}
        {tokenValid === false && (
          <>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: '#1a1917', marginBottom: 10 }}>
              Link expired or invalid
            </h2>
            <p style={{ fontSize: 14, color: '#5e5a52', lineHeight: 1.7, marginBottom: 24 }}>
              This password reset link is no longer valid. Reset links expire after 1 hour and can only be used once.
            </p>
            <Link
              href="/forgot-password"
              style={{
                display: 'inline-block', height: 44, lineHeight: '44px',
                padding: '0 24px', background: '#1D9E75', color: '#fff',
                borderRadius: 12, fontSize: 14, fontWeight: 500,
                textDecoration: 'none', fontFamily: 'var(--font-body)',
              }}
            >
              Request a new link →
            </Link>
          </>
        )}

        {/* ── Valid token: show form ── */}
        {tokenValid === true && status !== 'done' && (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: '#1a1917', marginBottom: 6 }}>
              Choose a new password
            </h1>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 28 }}>
              Pick something strong — at least 8 characters.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* New password */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#333', display: 'block', marginBottom: 6 }}>
                  New password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    style={{ ...inputStyle, paddingRight: 48 }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#1D9E75')}
                    onBlur={e  => (e.currentTarget.style.borderColor = '#e2ddd6')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 14, color: '#9e998f', padding: 0,
                    }}
                  >
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
                {/* Strength bar */}
                {password.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 3 }}>
                    {[1, 2, 3, 4].map(i => {
                      const strength = Math.min(4, Math.floor(password.length / 3))
                      return (
                        <div key={i} style={{
                          flex: 1, height: 3, borderRadius: 2,
                          background: i <= strength
                            ? (strength <= 1 ? '#ef4444' : strength <= 2 ? '#f97316' : strength <= 3 ? '#eab308' : '#22c55e')
                            : '#e2ddd6',
                          transition: 'background 0.2s',
                        }} />
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#333', display: 'block', marginBottom: 6 }}>
                  Confirm password
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your new password"
                  style={{
                    ...inputStyle,
                    borderColor: confirm && confirm !== password ? '#fda4af' : '#e2ddd6',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = confirm !== password ? '#fda4af' : '#1D9E75')}
                  onBlur={e  => (e.currentTarget.style.borderColor = confirm && confirm !== password ? '#fda4af' : '#e2ddd6')}
                />
                {confirm && confirm !== password && (
                  <p style={{ fontSize: 12, color: '#dc2626', margin: '4px 0 0' }}>Passwords don&apos;t match</p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#b91c1c',
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading' || !password || !confirm}
                style={{
                  width: '100%', height: 44, background: '#1D9E75', color: '#fff',
                  border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500,
                  cursor: status === 'loading' || !password || !confirm ? 'not-allowed' : 'pointer',
                  opacity: status === 'loading' || !password || !confirm ? 0.65 : 1,
                  fontFamily: 'var(--font-body)',
                }}
              >
                {status === 'loading' ? 'Updating…' : 'Set new password →'}
              </button>
            </form>
          </>
        )}

        {/* ── Success ── */}
        {status === 'done' && (
          <>
            <div style={{ fontSize: 36, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: '#1a1917', marginBottom: 10 }}>
              Password updated
            </h2>
            <p style={{ fontSize: 14, color: '#5e5a52', lineHeight: 1.7, marginBottom: 24 }}>
              Your password has been changed successfully. You can now sign in with your new password.
            </p>
            <Link
              href="/login"
              style={{
                display: 'inline-block', height: 44, lineHeight: '44px',
                padding: '0 24px', background: '#1D9E75', color: '#fff',
                borderRadius: 12, fontSize: 14, fontWeight: 500,
                textDecoration: 'none', fontFamily: 'var(--font-body)',
              }}
            >
              Sign in →
            </Link>
          </>
        )}

      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}
