import { NextRequest, NextResponse } from 'next/server'

// Routes that require the user to be logged in
const PROTECTED_PREFIXES = ['/tools/', '/dashboard/', '/tools']

// Tools that also require a paid plan (pro or enterprise)
export const PAID_TOOLS = new Set([
  '/tools/maintenance',
  '/tools/documents',
])

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Check if this path needs protection
  const needsAuth = PROTECTED_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(prefix + '/')  || pathname === '/tools'
  )
  if (!needsAuth) return NextResponse.next()

  // The pp_session cookie is set by auth.ts on every login/signup and cleared on logout.
  // It contains no sensitive data — it's just a flag the middleware can read server-side.
  const session = req.cookies.get('pp_session')?.value

  if (!session) {
    // Redirect to login, preserving the intended destination
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search   = `?redirect=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/tools',
    '/tools/:path*',
    '/dashboard',
    '/dashboard/:path*',
  ],
}
