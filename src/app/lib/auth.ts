/**
 * Auth & Property storage — lightweight localStorage-based auth for demo/MVP.
 *
 * Demo credentials
 *   demo@proppilot.com  /  PropDemo2024
 *
 * In production swap the DEMO_USERS table for a real auth provider (NextAuth,
 * Clerk, Supabase, etc.) and replace localStorage with server-side sessions.
 */

'use client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  email: string
  name:  string
  tier:  'free' | 'pro' | 'portfolio'
}

export interface StoredProperty {
  postcode:        string
  houseNumber:     string
  street:          string
  address:         string              // full one-line address for display
  tenure:          'Freehold' | 'Leasehold'
  purchasePrice:   number | null
  purchaseDate:    string | null       // ISO date "YYYY-MM-DD"
  yearBuilt:       number | null
  epcBand:         string | null       // e.g. "D"
  epcScore:        number | null       // 0–100
  estimatedValue:  number | null       // Land Registry estimate
  mortgageFixEnd:  string | null       // ISO date "YYYY-MM-DD"
  mortgageRate:    number | null       // e.g. 3.84
  addedAt:         string             // ISO datetime
}

// ─── In-memory user store ─────────────────────────────────────────────────────

const DEMO_USERS: Array<User & { password: string }> = [
  {
    email:    'demo@proppilot.com',
    password: 'PropDemo2024',
    name:     'Demo User',
    tier:     'pro',
  },
  {
    email:    'moin.siddiqui1982@gmail.com',
    password: 'PropDemo2024',
    name:     'Moin',
    tier:     'pro',
  },
]

// ─── Storage keys ─────────────────────────────────────────────────────────────

const AUTH_KEY     = 'pp_auth'
const PROPERTY_KEY = 'pp_property'

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/** Attempt login — returns the User on success, null on bad credentials. */
export function login(email: string, password: string): User | null {
  const match = DEMO_USERS.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  )
  if (!match) return null

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _pw, ...user } = match
  localStorage.setItem(AUTH_KEY, JSON.stringify({ user, loggedInAt: new Date().toISOString() }))
  return user
}

/** Clear auth state — call on sign-out. */
export function logout(): void {
  localStorage.removeItem(AUTH_KEY)
}

/** Read the currently logged-in user from localStorage. */
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

// ─── Property helpers ─────────────────────────────────────────────────────────

/** Read the stored property from localStorage. */
export function getProperty(): StoredProperty | null {
  try {
    const raw = localStorage.getItem(PROPERTY_KEY)
    return raw ? (JSON.parse(raw) as StoredProperty) : null
  } catch {
    return null
  }
}

/** Persist a property to localStorage. */
export function saveProperty(p: StoredProperty): void {
  localStorage.setItem(PROPERTY_KEY, JSON.stringify(p))
}

/** Remove the stored property (e.g. when changing property). */
export function clearProperty(): void {
  localStorage.removeItem(PROPERTY_KEY)
}
