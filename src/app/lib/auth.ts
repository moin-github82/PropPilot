'use client'

export type UserRole = 'buyer' | 'owner'
export type UserPlan = 'free' | 'pro' | 'enterprise'

export interface User {
  email: string
  name: string
  role: UserRole
  plan: UserPlan
}

export interface StoredProperty {
  postcode: string
  houseNumber: string
  street: string
  address: string
  tenure: 'Freehold' | 'Leasehold'
  purchasePrice: number | null
  purchaseDate: string | null
  yearBuilt: number | null
  epcBand: string | null
  epcScore: number | null
  estimatedValue: number | null
  mortgageFixEnd: string | null
  mortgageRate: number | null
  addedAt: string
}

// Demo users — two buyer and two owner accounts
const DEMO_USERS: Array<User & { password: string }> = [
  { email: 'demo@prophealth.com', password: 'PropDemo2024', name: 'Demo User', role: 'owner', plan: 'pro' },
  { email: 'moin.siddiqui1982@gmail.com', password: 'PropDemo2024', name: 'Moin', role: 'owner', plan: 'pro' },
  { email: 'buyer@prophealth.com', password: 'PropDemo2024', name: 'Demo Buyer', role: 'buyer', plan: 'pro' },
  { email: 'agent@prophealth.com', password: 'PropDemo2024', name: 'Demo Agent', role: 'buyer', plan: 'enterprise' },
]

const AUTH_KEY       = 'pp_auth'
const PROPERTY_KEY   = 'pp_property'
const SIGNUPS_KEY    = 'pp_signups'
const SESSION_COOKIE = 'pp_session'
const RESETS_KEY     = 'pp_resets'

// ── Cookie helpers (keeps middleware in sync with localStorage) ───────────────
function setSessionCookie() {
  // SameSite=Lax means the cookie is readable by the same-origin middleware.
  // Not httpOnly so JS can clear it on logout; no sensitive data stored here.
  const maxAge = 60 * 60 * 24 * 7 // 7 days
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${maxAge}; SameSite=Lax`
}

function clearSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`
}

// Returns the dashboard path for a role
export function dashboardPath(role: UserRole): string {
  return role === 'buyer' ? '/dashboard/buyer' : '/dashboard'
}

export function login(email: string, password: string): User | null {
  // Check demo users
  const demoMatch = DEMO_USERS.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  )
  if (demoMatch) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...user } = demoMatch
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user, loggedInAt: new Date().toISOString() }))
    setSessionCookie()
    return user
  }

  // Check localStorage signups
  try {
    const signups: Array<User & { password: string }> = JSON.parse(localStorage.getItem(SIGNUPS_KEY) ?? '[]')
    const match = signups.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
    if (match) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _pw, ...user } = match
      localStorage.setItem(AUTH_KEY, JSON.stringify({ user, loggedInAt: new Date().toISOString() }))
      setSessionCookie()
      return user
    }
  } catch {}

  return null
}

// Sign up a new user — stores in localStorage signups list
export function signup(email: string, password: string, name: string, role: UserRole): User | null {
  try {
    const signups: Array<User & { password: string }> = JSON.parse(localStorage.getItem(SIGNUPS_KEY) ?? '[]')
    const exists = signups.some(u => u.email.toLowerCase() === email.toLowerCase())
    const isDemoEmail = DEMO_USERS.some(u => u.email.toLowerCase() === email.toLowerCase())
    if (exists || isDemoEmail) return null // email already taken

    const user: User = { email, name, role, plan: 'free' }
    signups.push({ ...user, password })
    localStorage.setItem(SIGNUPS_KEY, JSON.stringify(signups))
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user, loggedInAt: new Date().toISOString() }))
    setSessionCookie()
    return user
  } catch {
    return null
  }
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY)
  clearSessionCookie()
}

export function getUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    return (JSON.parse(raw) as { user: User }).user
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return getUser() !== null
}

export function getProperty(): StoredProperty | null {
  try {
    const raw = localStorage.getItem(PROPERTY_KEY)
    return raw ? (JSON.parse(raw) as StoredProperty) : null
  } catch {
    return null
  }
}

export function saveProperty(p: StoredProperty): void {
  localStorage.setItem(PROPERTY_KEY, JSON.stringify(p))
}

export function clearProperty(): void {
  localStorage.removeItem(PROPERTY_KEY)
}

// ── Password reset ────────────────────────────────────────────────────────────

interface ResetEntry { email: string; token: string; expiresAt: string }

/** Returns true if the email belongs to a hardcoded demo account. */
export function isDemoEmail(email: string): boolean {
  return DEMO_USERS.some(u => u.email.toLowerCase() === email.toLowerCase())
}

/**
 * Creates a 1-hour reset token for a signed-up user.
 * Returns the token string, or null if the email is not found in signups.
 * (Demo accounts are not resettable — call isDemoEmail first.)
 */
export function requestPasswordReset(email: string): string | null {
  try {
    const signups: Array<User & { password: string }> = JSON.parse(localStorage.getItem(SIGNUPS_KEY) ?? '[]')
    const exists = signups.some(u => u.email.toLowerCase() === email.toLowerCase())
    if (!exists) return null

    const token     = crypto.randomUUID().replace(/-/g, '')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

    const resets: ResetEntry[] = JSON.parse(localStorage.getItem(RESETS_KEY) ?? '[]')
    const updated = resets.filter(r => r.email.toLowerCase() !== email.toLowerCase())
    updated.push({ email: email.toLowerCase(), token, expiresAt })
    localStorage.setItem(RESETS_KEY, JSON.stringify(updated))
    return token
  } catch {
    return null
  }
}

/** Validates a reset token (exists + not expired). */
export function isValidResetToken(token: string): boolean {
  try {
    const resets: ResetEntry[] = JSON.parse(localStorage.getItem(RESETS_KEY) ?? '[]')
    const entry = resets.find(r => r.token === token)
    return !!entry && new Date(entry.expiresAt) > new Date()
  } catch {
    return false
  }
}

/**
 * Applies a new password using the reset token.
 * Returns true on success, false if the token is invalid/expired.
 */
export function resetPassword(token: string, newPassword: string): boolean {
  try {
    const resets: ResetEntry[] = JSON.parse(localStorage.getItem(RESETS_KEY) ?? '[]')
    const entry = resets.find(r => r.token === token)
    if (!entry || new Date(entry.expiresAt) <= new Date()) return false

    const signups: Array<User & { password: string }> = JSON.parse(localStorage.getItem(SIGNUPS_KEY) ?? '[]')
    const idx = signups.findIndex(u => u.email.toLowerCase() === entry.email)
    if (idx === -1) return false

    signups[idx].password = newPassword
    localStorage.setItem(SIGNUPS_KEY, JSON.stringify(signups))

    // Consume the token so it can't be reused
    localStorage.setItem(RESETS_KEY, JSON.stringify(resets.filter(r => r.token !== token)))
    return true
  } catch {
    return false
  }
}
