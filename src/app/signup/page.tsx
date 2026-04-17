'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signup, isAuthenticated, dashboardPath, UserRole } from '../lib/auth'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<'role' | 'details'>('role')
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Already logged in → skip to dashboard
  useEffect(() => {
    if (isAuthenticated()) router.replace('/dashboard')
  }, [router])

  const handleContinue = () => {
    if (!selectedRole) return
    setStep('details')
    setError('')
  }

  const handleBack = () => {
    setStep('role')
    setError('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!selectedRole) {
      setError('Please select a role')
      return
    }

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    // Small artificial delay
    setTimeout(() => {
      const user = signup(email, password, name, selectedRole)
      setLoading(false)

      if (user) {
        router.push(dashboardPath(user.role))
      } else {
        setError('An account with this email already exists. Sign in instead.')
      }
    }, 600)
  }

  // ─── Step 1: Role picker ───────────────────────────────────────────────

  if (step === 'role') {
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
          style={{
            width: '100%',
            maxWidth: 600,
            padding: '36px 32px',
            background: '#fff',
            border: '1px solid #e2ddd6',
            borderRadius: 16,
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24,
              fontWeight: 500,
              color: '#1a1917',
              marginBottom: 12,
              textAlign: 'center',
            }}
          >
            What brings you here?
          </h1>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 32, textAlign: 'center' }}>
            Choose your role to get started with PropPilot
          </p>

          {/* Role cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
            {/* Buyer */}
            <div
              onClick={() => setSelectedRole('buyer')}
              style={{
                padding: '24px',
                border: selectedRole === 'buyer' ? '2px solid #1D9E75' : '1.5px solid #e2ddd6',
                borderRadius: 16,
                cursor: 'pointer',
                background: selectedRole === 'buyer' ? '#f0fdf4' : '#fff',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <p style={{ fontSize: 28, marginBottom: 8 }}>🏡</p>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1917', marginBottom: 8 }}>
                I&apos;m buying a home
              </h3>
              <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
                Get property reports, checklists, and buyer tools
              </p>
            </div>

            {/* Owner */}
            <div
              onClick={() => setSelectedRole('owner')}
              style={{
                padding: '24px',
                border: selectedRole === 'owner' ? '2px solid #1D9E75' : '1.5px solid #e2ddd6',
                borderRadius: 16,
                cursor: 'pointer',
                background: selectedRole === 'owner' ? '#f0fdf4' : '#fff',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <p style={{ fontSize: 28, marginBottom: 8 }}>🏠</p>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1917', marginBottom: 8 }}>
                I own a home
              </h3>
              <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
                Track maintenance, documents, and your property&apos;s value
              </p>
            </div>
          </div>

          {/* Continue button */}
          <button
            onClick={handleContinue}
            disabled={!selectedRole}
            style={{
              width: '100%',
              height: 44,
              background: selectedRole ? '#1D9E75' : '#ccc',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 500,
              cursor: selectedRole ? 'pointer' : 'not-allowed',
              transition: 'opacity 0.15s',
            }}
          >
            Continue →
          </button>
        </div>

        {/* Sign in link */}
        <p style={{ fontSize: 13, color: '#666', marginTop: 20 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}>
            Sign in →
          </Link>
        </p>
      </div>
    )
  }

  // ─── Step 2: Account details ───────────────────────────────────────────

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
        style={{
          width: '100%',
          maxWidth: 500,
          padding: '36px 32px',
          background: '#fff',
          border: '1px solid #e2ddd6',
          borderRadius: 16,
        }}
      >
        {/* Back button */}
        <button
          onClick={handleBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#1D9E75',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            marginBottom: 20,
            padding: 0,
          }}
        >
          ← Back
        </button>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 500,
            color: '#1a1917',
            marginBottom: 6,
          }}
        >
          Create your account
        </h1>

        {/* Role badge */}
        <div style={{ marginBottom: 24 }}>
          <span
            style={{
              display: 'inline-block',
              background: '#f0fdf4',
              border: '1px solid #86efac',
              color: '#15803d',
              fontSize: 12,
              fontWeight: 500,
              padding: '6px 12px',
              borderRadius: 6,
            }}
          >
            {selectedRole === 'buyer' ? '🏡 Home Buyer' : '🏠 Home Owner'}
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#333', display: 'block', marginBottom: 6 }}>
              Full name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
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

          {/* Email */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#333', display: 'block', marginBottom: 6 }}>
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
            <label style={{ fontSize: 13, fontWeight: 500, color: '#333', display: 'block', marginBottom: 6 }}>
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
            {password && password.length < 8 && (
              <p style={{ fontSize: 12, color: '#dc2626', marginTop: 6, margin: '6px 0 0 0' }}>
                Password must be at least 8 characters
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#333', display: 'block', marginBottom: 6 }}>
              Confirm password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
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
            {confirmPassword && password !== confirmPassword && (
              <p style={{ fontSize: 12, color: '#dc2626', marginTop: 6, margin: '6px 0 0 0' }}>
                Passwords do not match
              </p>
            )}
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
            {loading ? 'Creating account…' : 'Create account →'}
          </button>
        </form>
      </div>

      {/* Sign in link */}
      <p style={{ fontSize: 13, color: '#666', marginTop: 20 }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}>
          Sign in →
        </Link>
      </p>
    </div>
  )
}
