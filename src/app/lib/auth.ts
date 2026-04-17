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
  { email: 'demo@proppilot.com', password: 'PropDemo2024', name: 'Demo User', role: 'owner', plan: 'pro' },
  { email: 'moin.siddiqui1982@gmail.com', password: 'PropDemo2024', name: 'Moin', role: 'owner', plan: 'pro' },
  { email: 'buyer@proppilot.com', password: 'PropDemo2024', name: 'Demo Buyer', role: 'buyer', plan: 'pro' },
  { email: 'agent@proppilot.com', password: 'PropDemo2024', name: 'Demo Agent', role: 'buyer', plan: 'enterprise' },
]

const AUTH_KEY = 'pp_auth'
const PROPERTY_KEY = 'pp_property'
const SIGNUPS_KEY = 'pp_signups'

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
    return user
  } catch {
    return null
  }
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY)
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
