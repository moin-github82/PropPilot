import AsyncStorage from '@react-native-async-storage/async-storage'

export type UserRole = 'buyer' | 'owner'
export type UserPlan = 'free' | 'pro' | 'enterprise'

export interface User {
  name:  string
  email: string
  role:  UserRole
  plan:  UserPlan
}

const AUTH_KEY    = 'pp_auth'
const SIGNUPS_KEY = 'pp_signups'

// ── Read ─────────────────────────────────────────────────────────────────────

export async function getUser(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

// ── Write ────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<User> {
  const raw = await AsyncStorage.getItem(SIGNUPS_KEY)
  const signups: Array<User & { password: string }> = raw ? JSON.parse(raw) : []

  const found = signups.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  )
  if (!found) throw new Error('Invalid email or password.')

  const { password: _pw, ...user } = found
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user))
  return user
}

export async function signup(
  name: string,
  email: string,
  password: string,
  role: UserRole,
): Promise<User> {
  const raw = await AsyncStorage.getItem(SIGNUPS_KEY)
  const signups: Array<User & { password: string }> = raw ? JSON.parse(raw) : []

  if (signups.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('An account with this email already exists.')
  }

  const newUser: User & { password: string } = {
    name, email, role, plan: 'free', password,
  }
  signups.push(newUser)
  await AsyncStorage.setItem(SIGNUPS_KEY, JSON.stringify(signups))

  const { password: _pw, ...user } = newUser
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user))
  return user
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY)
}
