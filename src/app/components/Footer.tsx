'use client'

import Link from 'next/link'

const YEAR = new Date().getFullYear()

const LINKS = {
  'For Buyers': [
    { label: 'Property Report',   href: '/tools/property-report' },
    { label: 'Buying Checklists', href: '/tools/checklist' },
    { label: 'Stamp Duty Calc',   href: '/tools/stamp-duty' },
    { label: 'Lease Extension',   href: '/tools/lease-extension' },
    { label: 'Homebuyer Check',   href: '/homebuyer' },
  ],
  'For Owners': [
    { label: 'Owner Dashboard',   href: '/dashboard' },
    { label: 'EPC Upgrade Plan',  href: '/dashboard/epc-upgrade' },
    { label: 'Maintenance Cal.',  href: '/tools/maintenance' },
    { label: 'Document Vault',    href: '/tools/documents' },
    { label: 'Stamp Duty Calc',   href: '/tools/stamp-duty' },
  ],
  'Company': [
    { label: 'Pricing',           href: '/pricing' },
    { label: 'Sign up',           href: '/signup' },
    { label: 'Sign in',           href: '/login' },
    { label: 'Contact',           href: 'mailto:hello@prophealth.co.uk' },
  ],
}

export function Footer() {
  return (
    <footer style={{
      background: '#1a1917',
      color: '#9e998f',
      padding: 'clamp(40px,5vw,56px) clamp(16px,4vw,40px) 24px',
      marginTop: 'auto',
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Top row: logo + columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'auto repeat(3, 1fr)',
          gap: '32px 48px',
          marginBottom: 40,
        }}
          className="pp-footer-grid"
        >
          {/* Brand */}
          <div style={{ minWidth: 160 }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 8px', fontFamily: 'var(--font-display)' }}>
              Prop<span style={{ color: '#1D9E75' }}>Pilot</span>
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 16px', maxWidth: 200 }}>
              Your property. Fully understood.
            </p>
            <p style={{ fontSize: 12, color: '#5e5a52', margin: 0 }}>
              Manchester, United Kingdom
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([group, items]) => (
            <div key={group}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5e5a52', margin: '0 0 12px' }}>
                {group}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(item => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      style={{ fontSize: 13, color: '#9e998f', textDecoration: 'none', transition: 'color 0.12s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#fff'}
                      onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = '#9e998f'}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#2a2927', marginBottom: 20 }} />

        {/* Bottom bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <p style={{ fontSize: 12, color: '#5e5a52', margin: 0 }}>
            © {YEAR} PropHealth Ltd. Property data is provided for informational purposes only and does not constitute professional advice.
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy', 'Terms', 'Cookies'].map(l => (
              <Link key={l} href="#" style={{ fontSize: 12, color: '#5e5a52', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#9e998f'}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = '#5e5a52'}
              >
                {l}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile footer grid fix */}
      <style>{`
        @media (max-width: 640px) {
          .pp-footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </footer>
  )
}
