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
        <Link href={logoHref} className="pp-nav-logo">
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
