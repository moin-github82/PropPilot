'use client'

import { useState } from 'react'
import Link from 'next/link'

interface MobileItem {
  label: string
  href?: string
  onClick?: () => void
}

interface NavBarProps {
  /** Where the logo links — defaults to "/" */
  logoHref?: string
  /** Desktop nav content (links, buttons, badges). Hidden on mobile/tablet. */
  rightSlot: React.ReactNode
  /** Flat list rendered in the hamburger dropdown */
  mobileItems: MobileItem[]
}

/**
 * Shared sticky navigation bar with responsive hamburger menu.
 *
 * Usage:
 *   <NavBar
 *     rightSlot={<> <Link href="/tools">Tools</Link> … </>}
 *     mobileItems={[{ label: 'Tools', href: '/tools' }, …]}
 *   />
 */
export function NavBar({ logoHref = '/', rightSlot, mobileItems }: NavBarProps) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      <nav className="pp-nav">
        <Link href={logoHref} className="pp-nav-logo" style={{ display: 'inline-flex', alignItems: 'center' }}>
          {/* House icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ width: '1.25em', height: '1.25em', marginRight: '0.35em', flexShrink: 0, color: 'var(--brand-400)' }}
            aria-hidden="true"
          >
            <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
            <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
          </svg>
          Prop<span style={{ color: 'var(--brand-400)' }}>Health</span>
        </Link>

        {/* Desktop links */}
        <div className="pp-nav-desktop">{rightSlot}</div>

        {/* Hamburger */}
        <button
          className={`pp-hamburger${open ? ' open' : ''}`}
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <div className="pp-mobile-menu" role="menu">
          {mobileItems.map((item, i) =>
            item.onClick ? (
              <button key={i} onClick={() => { item.onClick!(); close() }}>
                {item.label}
              </button>
            ) : (
              <Link key={i} href={item.href!} onClick={close}>
                {item.label}
              </Link>
            )
          )}
        </div>
      )}
    </>
  )
}
