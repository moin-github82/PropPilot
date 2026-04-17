'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { login, isAuthenticated } from '../lib/auth'

export default function LoginPage() {
  const router  = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // Already logged in → skip to dashboard
  useEffect(() => {
    if (isAuthenticated()) router.replace('/dashboard')
  }, [router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Small artificial delay so it feels like a real auth call
    setTimeout(() => {
      const user = login(email, password)
      setLoading(false)
      if (user) {
        router.push('/dashboard')
      } else {
        setError('Incorrect email or password. Try the demo credentials below.')
      }
    }, 600)
  }

  const fillDemo = () => {
    setEmail('demo@proppilot.com')
    setPassword('PropDemo2024')
    setError('')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--slate-50)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', marginBottom: 36 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500, color: 'var(--slate-900)' }}>
          Prop<span style={{ color: 'var(--brand-400)' }}>Pilot</span>
        </span>
      </Link>

      {/* Card */}
      <div className="card fade-up" style={{ width: '100%', maxWidth: 400, padding: '36px 32px' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500,
          color: 'var(--slate-900)', marginBottom: 6,
        }}>
          Sign in to your account
        </h1>
        <p style={{ fontSize: 14, color: 'var(--slate-500)', marginBottom: 28 }}>
          Access your Homeowner Pro dashboard
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--slate-700)', display: 'block', marginBottom: 6 }}>
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: '100%', height: 44, padding: '0 14px', fontSize: 14,
                border: '1.5px solid var(--slate-200)', borderRadius: 'var(--radius-md)',
                background: '#fff', color: 'var(--slate-800)', outline: 'none',
                fontFamily: 'var(--font-body)',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--brand-400)'}
              onBlur={e  => e.target.style.borderColor = 'var(--slate-200)'}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--slate-700)', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', height: 44, padding: '0 14px', fontSize: 14,
                border: '1.5px solid var(--slate-200)', borderRadius: 'var(--radius-md)',
                background: '#fff', color: 'var(--slate-800)', outline: 'none',
                fontFamily: 'var(--font-body)',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--brand-400)'}
              onBlur={e  => e.target.style.borderColor = 'var(--slate-200)'}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)', padding: '10px 14px',
              fontSize: 13, color: '#b91c1c',
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          margin: '24px 0', color: 'var(--slate-300)',
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--slate-200)' }} />
          <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>or try the demo</span>
          <div style={{ flex: 1, height: 1, background: 'var(--slate-200)' }} />
        </div>

        {/* Demo credentials */}
        <div
          onClick={fillDemo}
          style={{
            background: 'var(--brand-50)', border: '1px dashed var(--brand-200)',
            borderRadius: 'var(--radius-md)', padding: '14px 16px',
            cursor: 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#d1f5eb')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--brand-50)')}
        >
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--brand-800)', marginBottom: 6 }}>
            ✦ Homeowner Pro demo account
          </p>
          <p style={{ fontSize: 13, color: 'var(--brand-600)', margin: '2px 0', fontFamily: 'var(--font-mono)' }}>
            demo@proppilot.com
          </p>
          <p style={{ fontSize: 13, color: 'var(--brand-600)', margin: '2px 0', fontFamily: 'var(--font-mono)' }}>
            PropDemo2024
          </p>
          <p style={{ fontSize: 11, color: 'var(--brand-400)', marginTop: 8, marginBottom: 0 }}>
            Click to fill in automatically →
          </p>
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 20 }}>
        ← <Link href="/" style={{ color: 'var(--slate-500)', textDecoration: 'none' }}>Back to PropPilot.co.uk</Link>
      </p>
    </div>
  )
}
