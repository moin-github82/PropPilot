'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { login, isAuthenticated, dashboardPath } from '../lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
        router.push(dashboardPath(user.role))
      } else {
        setError('Incorrect email or password. Try the demo credentials below.')
      }
    }, 600)
  }

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('PropDemo2024')
    setError('')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8f7f4',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', marginBottom: 36 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500, color: '#1a1917' }}>
          Prop<span style={{ color: '#1D9E75' }}>Pilot</span>
        </span>
      </Link>

      {/* Card */}
      <div
        className="card fade-up"
        style={{ width: '100%', maxWidth: 500, padding: '36px 32px', background: '#fff', border: '1px solid #e2ddd6', borderRadius: 16 }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 500,
            color: '#1a1917',
            marginBottom: 6,
          }}
        >
          Sign in to your account
        </h1>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 28 }}>
          Sign in to your PropPilot account
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email */}
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#333',
                display: 'block',
                marginBottom: 6,
              }}
            >
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: '100%',
                height: 44,
                padding: '0 14px',
                fontSize: 14,
                border: '1.5px solid #e2ddd6',
                borderRadius: 12,
                background: '#fff',
                color: '#333',
                outline: 'none',
                fontFamily: 'var(--font-body)',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#1D9E75')}
              onBlur={e => (e.currentTarget.style.borderColor = '#e2ddd6')}
            />
          </div>

          {/* Password */}
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#333',
                display: 'block',
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                height: 44,
                padding: '0 14px',
                fontSize: 14,
                border: '1.5px solid #e2ddd6',
                borderRadius: 12,
                background: '#fff',
                color: '#333',
                outline: 'none',
                fontFamily: 'var(--font-body)',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#1D9E75')}
              onBlur={e => (e.currentTarget.style.borderColor = '#e2ddd6')}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: 13,
                color: '#b91c1c',
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: 44,
              background: '#1D9E75',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'opacity 0.15s',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '24px 0',
            color: '#ccc',
          }}
        >
          <div style={{ flex: 1, height: 1, background: '#e2ddd6' }} />
          <span style={{ fontSize: 12, color: '#999' }}>or try the demo</span>
          <div style={{ flex: 1, height: 1, background: '#e2ddd6' }} />
        </div>

        {/* Demo credentials — two side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 0 }}>
          {/* Homeowner demo */}
          <div
            onClick={() => fillDemo('demo@proppilot.com')}
            style={{
              background: '#f0fdf4',
              border: '1px dashed #86efac',
              borderRadius: 12,
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#dcfce7')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f0fdf4')}
          >
            <p style={{ fontSize: 12, fontWeight: 500, color: '#15803d', marginBottom: 6 }}>
              🏠 Homeowner
            </p>
            <p style={{ fontSize: 12, color: '#22c55e', margin: '2px 0', fontFamily: 'monospace' }}>
              demo@proppilot.com
            </p>
            <p style={{ fontSize: 11, color: '#1D9E75', marginTop: 8, marginBottom: 0 }}>
              Click to fill →
            </p>
          </div>

          {/* HomeBuyer demo */}
          <div
            onClick={() => fillDemo('buyer@proppilot.com')}
            style={{
              background: '#f0fdf4',
              border: '1px dashed #86efac',
              borderRadius: 12,
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#dcfce7')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f0fdf4')}
          >
            <p style={{ fontSize: 12, fontWeight: 500, color: '#15803d', marginBottom: 6 }}>
              🏡 Home Buyer
            </p>
            <p style={{ fontSize: 12, color: '#22c55e', margin: '2px 0', fontFamily: 'monospace' }}>
              buyer@proppilot.com
            </p>
            <p style={{ fontSize: 11, color: '#1D9E75', marginTop: 8, marginBottom: 0 }}>
              Click to fill →
            </p>
          </div>
        </div>
      </div>

      {/* Sign up link */}
      <p style={{ fontSize: 13, color: '#666', marginTop: 20, marginBottom: 0 }}>
        Don&apos;t have an account?{' '}
        <Link href="/signup" style={{ color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}>
          Sign up →
        </Link>
      </p>

      <p style={{ fontSize: 13, color: '#999', marginTop: 16 }}>
        ← <Link href="/" style={{ color: '#666', textDecoration: 'none' }}>Back to PropPilot.co.uk</Link>
      </p>
    </div>
  )
}
