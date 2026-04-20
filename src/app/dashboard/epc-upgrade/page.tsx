'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { NavBar } from '../../components/NavBar'
import { getUser, getProperty, logout } from '../../lib/auth'
import type { User, StoredProperty } from '../../lib/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UpgradeRecommendation {
  upgrade:            string
  description:        string
  estimatedCostRange: string
  annualSavingsRange: string
  bandImprovement:    string
  grants:             string[]
  priority:           'high' | 'medium' | 'low'
}

// ─── EPC band helpers ─────────────────────────────────────────────────────────

const BAND_SCORE: Record<string, [number, number]> = {
  A: [92, 100], B: [81, 91], C: [69, 80],
  D: [55, 68],  E: [39, 54], F: [21, 38], G: [1, 20],
}

const BAND_COLOR: Record<string, string> = {
  A: '#22c55e', B: '#84cc16', C: '#a3e635',
  D: '#facc15', E: '#fb923c', F: '#f87171', G: '#ef4444',
}

const BANDS = ['G', 'F', 'E', 'D', 'C', 'B', 'A']

function bandToMidScore(band: string): number {
  const r = BAND_SCORE[band.toUpperCase()]
  return r ? Math.round((r[0] + r[1]) / 2) : 60
}

function parseCostLow(range: string): number {
  const m = range.match(/£([\d,]+)/)
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : 0
}
function parseCostHigh(range: string): number {
  const ms = range.match(/£([\d,]+)/g)
  if (!ms || ms.length < 2) return parseCostLow(range)
  return parseInt(ms[1].replace(/[£,]/g, ''), 10)
}
function parseSavingsHigh(range: string): number {
  return parseCostHigh(range.replace('/yr', ''))
}

// ─── Fallback upgrade suggestions (when EPC cert not available) ───────────────
// Based purely on declared band — conservative but useful starting point.

function getFallbackUpgrades(band: string): UpgradeRecommendation[] {
  const b = band.toUpperCase()
  const upgrades: UpgradeRecommendation[] = []

  if (['D', 'E', 'F', 'G'].includes(b)) {
    upgrades.push({
      upgrade:            'Loft insulation',
      description:        'Adding 270 mm of mineral wool to an uninsulated or poorly insulated loft is typically the highest-impact, lowest-cost measure. Can be done in a day.',
      estimatedCostRange: '£300–£700',
      annualSavingsRange: '£150–£300/yr',
      bandImprovement:    '+1–2 bands typical',
      grants:             ['ECO4', 'Great British Insulation Scheme'],
      priority:           'high',
    })
    upgrades.push({
      upgrade:            'Cavity wall insulation',
      description:        'Injecting insulation into the cavity between inner and outer walls. Suitable for homes built after ~1920 with unfilled cavities. A surveyor checks suitability first.',
      estimatedCostRange: '£400–£1,000',
      annualSavingsRange: '£100–£280/yr',
      bandImprovement:    '+1 band typical',
      grants:             ['ECO4', 'Great British Insulation Scheme'],
      priority:           'high',
    })
  }

  if (['D', 'E', 'F', 'G'].includes(b)) {
    upgrades.push({
      upgrade:            'Air source heat pump',
      description:        'Replace a gas or oil boiler with an air source heat pump — eligible for the £7,500 Boiler Upgrade Scheme grant. Works best in well-insulated homes.',
      estimatedCostRange: '£7,000–£13,000',
      annualSavingsRange: '£500–£1,200/yr',
      bandImprovement:    '+2–3 bands typical',
      grants:             ['Boiler Upgrade Scheme (£7,500)'],
      priority:           'high',
    })
  }

  if (['E', 'F', 'G'].includes(b)) {
    upgrades.push({
      upgrade:            'Solid wall insulation (internal or external)',
      description:        'For pre-1920 solid-wall properties without a cavity. Internal insulation reduces room size slightly; external insulation changes the façade. Major improvement to heat retention.',
      estimatedCostRange: '£5,000–£18,000',
      annualSavingsRange: '£300–£700/yr',
      bandImprovement:    '+2–3 bands typical',
      grants:             ['ECO4 (for eligible households)', 'Home Upgrade Grant'],
      priority:           'high',
    })
  }

  upgrades.push({
    upgrade:            'Solar PV panels',
    description:        'Install 3–4 kWp solar panels on a south- or south-west-facing roof. Generates free electricity, reducing bills year-round. Earnings via the Smart Export Guarantee.',
    estimatedCostRange: '£5,000–£8,000',
    annualSavingsRange: '£300–£700/yr',
    bandImprovement:    '+1–2 bands typical',
    grants:             ['Smart Export Guarantee (SEG payments for exported electricity)'],
    priority:           'medium',
  })

  upgrades.push({
    upgrade:            'Smart thermostat & heating controls',
    description:        'A modern smart thermostat (Nest, Hive, Tado) with TRVs per room cuts heating waste significantly. Quick to install and provides immediate savings.',
    estimatedCostRange: '£150–£350',
    annualSavingsRange: '£75–£150/yr',
    bandImprovement:    'Marginal — but improves EPC score',
    grants:             [],
    priority:           'low',
  })

  if (['F', 'G'].includes(b)) {
    upgrades.push({
      upgrade:            'Double or triple glazing',
      description:        'Replacing single-glazed windows throughout is expensive but dramatically reduces heat loss and draughts. Conservation areas may require planning permission.',
      estimatedCostRange: '£3,000–£8,000',
      annualSavingsRange: '£80–£235/yr',
      bandImprovement:    '+1 band typical',
      grants:             ['ECO4 (for eligible households)'],
      priority:           'medium',
    })
  }

  return upgrades
}

// ─── Third-party services data ─────────────────────────────────────────────────

interface Service {
  name:        string
  tagline:     string
  url:         string
  tags:        string[]
  badge?:      string
  badgeColor?: string
}

interface ServiceCategory {
  id:       string
  icon:     string
  title:    string
  subtitle: string
  services: Service[]
}

const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id:       'grants',
    icon:     '🏛️',
    title:    'Government grants & schemes',
    subtitle: 'Free or subsidised funding — always check eligibility first',
    services: [
      {
        name:    'ECO4 Scheme',
        tagline: 'Free insulation and heating upgrades for eligible households (benefits/low income)',
        url:     'https://www.gov.uk/energy-company-obligation',
        tags:    ['Insulation', 'Heating', 'Free'],
        badge: 'Free', badgeColor: '#22c55e',
      },
      {
        name:    'Great British Insulation Scheme',
        tagline: 'Subsidised insulation for Band D–G homes. Income and general eligibility tracks.',
        url:     'https://www.gov.uk/great-british-insulation-scheme',
        tags:    ['Insulation', 'Subsidised'],
        badge: 'Subsidised', badgeColor: '#a3e635',
      },
      {
        name:    'Boiler Upgrade Scheme',
        tagline: '£7,500 grant towards an air source or ground source heat pump. No income test.',
        url:     'https://www.gov.uk/apply-boiler-upgrade-scheme',
        tags:    ['Heat pump', 'Grant'],
        badge: '£7,500', badgeColor: '#f59e0b',
      },
      {
        name:    'Home Upgrade Grant (HUG2)',
        tagline: 'For off-gas-grid, low-income households — covers insulation, heat pumps, solar.',
        url:     'https://www.gov.uk/guidance/home-upgrade-grant',
        tags:    ['Insulation', 'Heat pump', 'Solar'],
        badge: 'Income-based', badgeColor: '#94a3b8',
      },
      {
        name:    'Simple Energy Advice (gov.uk)',
        tagline: 'Free, impartial gov.uk tool to find all grants and schemes you personally qualify for.',
        url:     'https://www.simpleenergyadvice.org.uk',
        tags:    ['All improvements', 'Check eligibility'],
        badge: 'Free tool', badgeColor: 'var(--brand-400)',
      },
    ],
  },
  {
    id:       'installers',
    icon:     '🏗️',
    title:    'Find a trusted installer',
    subtitle: 'Government-endorsed directories — always get 3 quotes',
    services: [
      {
        name:    'TrustMark',
        tagline: 'Government-endorsed scheme for energy efficiency retrofit work. Find vetted local tradespeople.',
        url:     'https://www.trustmark.org.uk',
        tags:    ['All improvements', 'Government-endorsed'],
        badge: 'Gov endorsed', badgeColor: 'var(--brand-400)',
      },
      {
        name:    'MCS Certified',
        tagline: 'Certification for renewable energy (heat pumps, solar PV). Only MCS installers can apply for BUS grant.',
        url:     'https://www.mcscertified.com/find-an-installer',
        tags:    ['Heat pump', 'Solar PV'],
        badge: 'Required for grants', badgeColor: '#f59e0b',
      },
      {
        name:    'Which? Trusted Traders',
        tagline: 'Independently vetted tradespeople for glazing, insulation, boilers, and more.',
        url:     'https://trustedtraders.which.co.uk',
        tags:    ['All improvements', 'Vetted'],
      },
      {
        name:    'FENSA Directory',
        tagline: 'Find FENSA-registered glazing installers — self-certify Building Regs compliance.',
        url:     'https://www.fensa.org.uk/find-an-installer',
        tags:    ['Windows', 'Doors'],
      },
    ],
  },
  {
    id:       'heat-pumps',
    icon:     '🌡️',
    title:    'Heat pump specialists',
    subtitle: 'Use an MCS-certified installer to qualify for the £7,500 BUS grant',
    services: [
      {
        name:    'Octopus Energy Heat Pumps',
        tagline: 'One of the UK\'s largest heat pump installers. Fixed-price quotes, MCS certified.',
        url:     'https://octopusenergy.com/heat-pumps',
        tags:    ['Air source', 'MCS certified', 'Fixed price'],
        badge: 'Popular', badgeColor: 'var(--brand-400)',
      },
      {
        name:    'Vaillant',
        tagline: 'Premium heat pump manufacturer with a network of certified UK installers.',
        url:     'https://www.vaillant.co.uk/homeowners/products/heat-pumps/',
        tags:    ['Air source', 'Ground source'],
      },
      {
        name:    'Worcester Bosch',
        tagline: 'Established UK boiler brand now offering air source heat pumps with full installation.',
        url:     'https://www.worcester-bosch.co.uk/products/heat-pumps',
        tags:    ['Air source'],
      },
      {
        name:    'Daikin UK',
        tagline: 'Global heat pump brand with a wide UK installer network. Known for reliability.',
        url:     'https://www.daikin.co.uk',
        tags:    ['Air source', 'Ground source'],
      },
    ],
  },
  {
    id:       'insulation',
    icon:     '🧱',
    title:    'Insulation providers',
    subtitle: 'Ask if you qualify for ECO4 or GBIS before paying full price',
    services: [
      {
        name:    'British Zipp',
        tagline: 'National insulation installer offering loft, cavity wall, and solid wall insulation.',
        url:     'https://www.britishzipp.com',
        tags:    ['Loft', 'Cavity wall', 'Solid wall'],
      },
      {
        name:    'Evergreen Energy',
        tagline: 'ECO4 and GBIS registered insulation specialist — checks your eligibility for free grants.',
        url:     'https://www.evergreenenergy.co.uk',
        tags:    ['ECO4', 'GBIS', 'Free survey'],
        badge: 'Grant eligible', badgeColor: '#22c55e',
      },
      {
        name:    'National Insulation Association',
        tagline: 'Trade body directory of vetted insulation contractors across the UK.',
        url:     'https://www.nationalinsulationassociation.org.uk/find-an-installer',
        tags:    ['Find installer', 'Trade body'],
      },
      {
        name:    'Energy Saving Trust',
        tagline: 'Impartial advice on insulation options and finding installers via gov-funded advisers.',
        url:     'https://energysavingtrust.org.uk',
        tags:    ['Free advice', 'Impartial'],
        badge: 'Impartial', badgeColor: 'var(--brand-400)',
      },
    ],
  },
  {
    id:       'solar',
    icon:     '☀️',
    title:    'Solar PV installers',
    subtitle: 'Generate your own electricity and earn via the Smart Export Guarantee',
    services: [
      {
        name:    'Octopus Energy Solar',
        tagline: 'Turnkey solar installation with optional battery storage. Manages SEG payments.',
        url:     'https://octopus.energy/solar/',
        tags:    ['Solar PV', 'Battery storage', 'SEG'],
        badge: 'Popular', badgeColor: 'var(--brand-400)',
      },
      {
        name:    'Good Energy',
        tagline: '100% renewable energy supplier offering solar PV installation and SEG tariffs.',
        url:     'https://www.goodenergy.co.uk/solar',
        tags:    ['Solar PV', 'SEG tariff'],
      },
      {
        name:    'Solar Energy UK',
        tagline: 'Trade association directory to find MCS-certified solar installers near you.',
        url:     'https://solarenergyuk.org/find-an-installer/',
        tags:    ['Find installer', 'MCS certified'],
      },
    ],
  },
  {
    id:       'smart-controls',
    icon:     '🌡️',
    title:    'Smart heating controls',
    subtitle: 'Quick win — install in a day, save from day one',
    services: [
      {
        name:    'Nest (Google)',
        tagline: 'Learning thermostat that builds a schedule automatically. Works with most boilers.',
        url:     'https://store.google.com/gb/category/nest',
        tags:    ['Smart thermostat', 'Learning'],
      },
      {
        name:    'Hive by British Gas',
        tagline: 'Popular smart thermostat with app control and TRV kit for room-by-room heating.',
        url:     'https://www.hivehome.com',
        tags:    ['Smart thermostat', 'TRVs'],
      },
      {
        name:    'Tado',
        tagline: 'Geofencing smart thermostat — turns heating off when you leave, on when you return.',
        url:     'https://www.tado.com/gb-en',
        tags:    ['Smart thermostat', 'Geofencing'],
      },
    ],
  },
]

// ─── Band visualizer ──────────────────────────────────────────────────────────

function BandJourney({ current, target = 'C' }: { current: string; target?: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      {BANDS.map((b, i) => {
        const isCurrent = b === current.toUpperCase()
        const isTarget  = b === target
        const isBetween = BANDS.indexOf(b) > BANDS.indexOf(current.toUpperCase()) &&
                          BANDS.indexOf(b) <= BANDS.indexOf(target)

        return (
          <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width:  isCurrent || isTarget ? 52 : 36,
              height: isCurrent || isTarget ? 52 : 36,
              borderRadius: 10,
              background: BAND_COLOR[b],
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              opacity: isBetween || isCurrent || isTarget ? 1 : 0.25,
              outline: isCurrent ? '3px solid var(--slate-800)' : isTarget ? '3px solid var(--brand-400)' : 'none',
              outlineOffset: 2,
              transition: 'all 0.2s',
              position: 'relative',
            }}>
              <span style={{ fontSize: isCurrent || isTarget ? 20 : 14, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>{b}</span>
              {isCurrent && <span style={{ position: 'absolute', bottom: -20, fontSize: 10, color: 'var(--slate-600)', whiteSpace: 'nowrap' }}>Current</span>}
              {isTarget  && <span style={{ position: 'absolute', bottom: -20, fontSize: 10, color: 'var(--brand-600)', fontWeight: 600, whiteSpace: 'nowrap' }}>Target</span>}
            </div>
            {i < BANDS.length - 1 && (
              <span style={{ color: isBetween ? 'var(--brand-400)' : 'var(--slate-200)', fontSize: 16, fontWeight: 300 }}>→</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Upgrade card ─────────────────────────────────────────────────────────────

const PRIORITY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  high:   { bg: '#fee2e2', color: '#dc2626', label: 'High priority' },
  medium: { bg: '#fef3c7', color: '#d97706', label: 'Medium priority' },
  low:    { bg: 'var(--brand-50)', color: 'var(--brand-600)', label: 'Quick win' },
}

function UpgradeCard({ rec, index }: { rec: UpgradeRecommendation; index: number }) {
  const ps = PRIORITY_STYLE[rec.priority]
  return (
    <div className="card" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* Number */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: 'var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 600, color: 'var(--slate-600)',
      }}>
        {index + 1}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, color: 'var(--slate-900)', margin: 0, flex: 1 }}>{rec.upgrade}</h3>
          <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20, background: ps.bg, color: ps.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {ps.label}
          </span>
        </div>

        <p style={{ fontSize: 14, color: 'var(--slate-600)', lineHeight: 1.6, margin: '0 0 14px' }}>{rec.description}</p>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 14 }}>
          <div style={{ background: 'var(--slate-50)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
            <p style={{ fontSize: 11, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>Estimated cost</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--slate-900)', margin: 0 }}>{rec.estimatedCostRange}</p>
          </div>
          <div style={{ background: 'var(--brand-50)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
            <p style={{ fontSize: 11, color: 'var(--brand-600)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>Annual saving</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--brand-800)', margin: 0 }}>{rec.annualSavingsRange}</p>
          </div>
          <div style={{ background: '#f0fdf4', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
            <p style={{ fontSize: 11, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>EPC impact</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#15803d', margin: 0 }}>{rec.bandImprovement}</p>
          </div>
        </div>

        {/* Grants */}
        {rec.grants.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--slate-500)', alignSelf: 'center' }}>Grants:</span>
            {rec.grants.map((g, i) => (
              <span key={i} style={{ fontSize: 12, background: '#fef9c3', color: '#854d0e', padding: '3px 8px', borderRadius: 20, border: '1px solid #fde68a' }}>
                ✦ {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Service card ─────────────────────────────────────────────────────────────

function ServiceCard({ s }: { s: Service }) {
  return (
    <a
      href={s.url} target="_blank" rel="noopener noreferrer"
      style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: '14px 16px', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--slate-200)', background: '#fff',
        textDecoration: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-200)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--slate-200)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--slate-900)', margin: 0, flex: 1 }}>{s.name}</p>
        {s.badge && (
          <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: `${s.badgeColor}20`, color: s.badgeColor, border: `1px solid ${s.badgeColor}40`, flexShrink: 0 }}>
            {s.badge}
          </span>
        )}
        <span style={{ fontSize: 13, color: 'var(--slate-400)', flexShrink: 0 }}>↗</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--slate-500)', margin: 0, lineHeight: 1.5 }}>{s.tagline}</p>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {s.tags.map((t, i) => (
          <span key={i} style={{ fontSize: 11, background: 'var(--slate-50)', color: 'var(--slate-500)', padding: '2px 7px', borderRadius: 20, border: '1px solid var(--slate-200)' }}>
            {t}
          </span>
        ))}
      </div>
    </a>
  )
}

// ─── PropHealth support section ────────────────────────────────────────────────

function PropHealthSupport({ property }: { property: StoredProperty }) {
  const supports = [
    {
      icon: '🔍',
      title: 'Run a full property check',
      body: 'Get your exact EPC upgrade list, cost estimates, and grants — pulled live from the EPC Register for your specific property.',
      cta: 'Start your check',
      href: `/homebuyer?postcode=${encodeURIComponent(property.postcode)}&address=${encodeURIComponent(property.address)}`,
    },
    {
      icon: '🔧',
      title: 'Track upgrades in your maintenance calendar',
      body: 'Add each upgrade as a planned maintenance task so you never lose track of what\'s been done, when, and by whom.',
      cta: 'Open maintenance calendar',
      href: '/tools/maintenance',
    },
    {
      icon: '📁',
      title: 'Store EPC, warranties & invoices',
      body: 'Keep your updated EPC certificate, installer warranties, and invoice receipts in your document vault. Essential for future sale or remortgage.',
      cta: 'Open document vault',
      href: '/tools/documents',
    },
    {
      icon: '🏷️',
      title: 'Calculate your updated stamp duty position',
      body: 'A Band C+ property attracts better mortgage rates and could save thousands in LTV-related costs. Model your position with our SDLT calculator.',
      cta: 'Open stamp duty calculator',
      href: '/tools/stamp-duty',
    },
  ]

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 500, color: 'var(--slate-900)', marginBottom: 6 }}>How PropHealth supports you</h2>
      <p style={{ fontSize: 14, color: 'var(--slate-500)', marginBottom: 20 }}>
        We help you plan, track, and document your entire EPC improvement journey in one place.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
        {supports.map((s, i) => (
          <Link
            key={i} href={s.href}
            style={{
              display: 'flex', flexDirection: 'column', gap: 10,
              padding: '18px 20px', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--brand-100)', background: 'var(--brand-50)',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: 24 }}>{s.icon}</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--brand-800)', margin: '0 0 5px' }}>{s.title}</p>
              <p style={{ fontSize: 13, color: 'var(--brand-600)', margin: 0, lineHeight: 1.5 }}>{s.body}</p>
            </div>
            <span style={{ fontSize: 13, color: 'var(--brand-400)', fontWeight: 500, marginTop: 'auto' }}>{s.cta} →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EPCUpgradePage() {
  const router = useRouter()
  const [user,     setUser]     = useState<User | null>(null)
  const [property, setProperty] = useState<StoredProperty | null>(null)
  const [upgrades, setUpgrades] = useState<UpgradeRecommendation[]>([])
  const [loading,  setLoading]  = useState(true)
  const [liveEPC,  setLiveEPC]  = useState(false) // true if recommendations came from live EPC API

  useEffect(() => {
    const u = getUser()
    if (!u) { router.replace('/login'); return }
    setUser(u)

    const p = getProperty()
    if (!p) { router.replace('/dashboard'); return }
    setProperty(p)

    // Try to fetch live EPC upgrade recommendations
    const fetchUpgrades = async () => {
      try {
        const postcode = p.postcode.replace(/\s/g, '').toUpperCase()
        const address  = `${p.houseNumber} ${p.street}`
        const res  = await fetch(`/api/epc/${encodeURIComponent(postcode)}?address=${encodeURIComponent(address)}`)
        const data = await res.json()

        if (data.found && data.upgradeRecommendations?.length) {
          setUpgrades(data.upgradeRecommendations)
          setLiveEPC(true)
        } else {
          setUpgrades(getFallbackUpgrades(p.epcBand ?? 'D'))
        }
      } catch {
        setUpgrades(getFallbackUpgrades(p.epcBand ?? 'D'))
      }
      setLoading(false)
    }

    fetchUpgrades()
  }, [router])

  if (!user || !property) return null

  const band  = property.epcBand ?? 'D'
  const score = property.epcScore ?? bandToMidScore(band)

  const totalCostLow  = upgrades.reduce((s, u) => s + parseCostLow(u.estimatedCostRange), 0)
  const totalCostHigh = upgrades.reduce((s, u) => s + parseCostHigh(u.estimatedCostRange), 0)
  const totalSavings  = upgrades.reduce((s, u) => s + parseSavingsHigh(u.annualSavingsRange), 0)
  const totalGrants   = upgrades.flatMap(u => u.grants).length

  const alreadyC = ['C', 'B', 'A'].includes(band.toUpperCase())

  return (
    <div style={{ minHeight: '100vh', background: 'var(--slate-50)' }}>
      <NavBar
        rightSlot={<>
          <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--slate-600)', textDecoration: 'none' }}>← Dashboard</Link>
          <button
            onClick={() => { logout(); router.push('/') }}
            style={{ fontSize: 13, color: 'var(--slate-500)', background: 'none', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </>}
        mobileItems={[
          { label: '← Dashboard', href: '/dashboard' },
          { label: 'Sign out',    onClick: () => { logout(); router.push('/') } },
        ]}
      />

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '36px clamp(16px,3vw,24px)', display: 'flex', flexDirection: 'column', gap: 36 }}>

        {/* Header */}
        <div className="fade-up">
          <span className="tag tag-green" style={{ marginBottom: 12, display: 'inline-block' }}>EPC upgrade planner</span>
          <h1 style={{ fontSize: 28, fontWeight: 500, color: 'var(--slate-900)', marginBottom: 6 }}>
            {alreadyC
              ? `You're already at Band ${band} — well done!`
              : `Getting ${property.address.split(',')[0]} to Band C`}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--slate-500)', margin: 0 }}>
            {alreadyC
              ? 'Your property meets the 2030 EPC target. The information below can still help you improve further.'
              : `Current band: ${band} (score ~${score}/100) · Target: Band C (score 69+) · Government deadline: 2030`}
          </p>
          {liveEPC && (
            <p style={{ fontSize: 12, color: 'var(--brand-600)', marginTop: 8 }}>
              ✓ Recommendations based on your live EPC certificate from the register
            </p>
          )}
          {!liveEPC && !loading && (
            <p style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 8 }}>
              Showing typical upgrades for Band {band} properties. Run a full property check for personalised recommendations based on your EPC certificate.
            </p>
          )}
        </div>

        {/* Band journey visualizer */}
        <div className="card fade-up-d1">
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 20 }}>
            Your EPC journey to Band C
          </p>
          <BandJourney current={band} target="C" />
        </div>

        {/* Summary stats */}
        {!alreadyC && (
          <div className="fade-up-d2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
            {[
              { label: 'Estimated upgrade cost', value: `£${totalCostLow.toLocaleString()}–£${totalCostHigh.toLocaleString()}`, sub: 'Before grants', color: 'var(--slate-900)' },
              { label: 'Potential annual saving', value: `up to £${totalSavings.toLocaleString()}/yr`, sub: 'Once all done', color: 'var(--brand-600)' },
              { label: 'Grant schemes available', value: `${totalGrants} schemes`, sub: 'Could offset significant cost', color: '#d97706' },
              { label: '2030 government deadline', value: '4 years', sub: 'For rental compliance', color: '#dc2626' },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: '18px 20px' }}>
                <p style={{ fontSize: 11, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 5px' }}>{s.label}</p>
                <p style={{ fontSize: 18, fontWeight: 600, color: s.color, margin: '0 0 2px', fontFamily: 'var(--font-display)' }}>{s.value}</p>
                <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: 0 }}>{s.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Upgrade recommendations */}
        <div className="fade-up-d2">
          <h2 style={{ fontSize: 20, fontWeight: 500, color: 'var(--slate-900)', marginBottom: 6 }}>
            Recommended upgrades
          </h2>
          <p style={{ fontSize: 14, color: 'var(--slate-500)', marginBottom: 20 }}>
            Sorted by priority. Tackle high-priority items first — they typically give the biggest band improvement per pound spent.
          </p>

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--slate-400)' }}>
              Fetching your EPC certificate…
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {upgrades.map((rec, i) => <UpgradeCard key={i} rec={rec} index={i} />)}
            </div>
          )}
        </div>

        {/* PropHealth support */}
        <div className="fade-up-d3">
          <PropHealthSupport property={property} />
        </div>

        {/* Third-party services */}
        <div className="fade-up-d3">
          <h2 style={{ fontSize: 20, fontWeight: 500, color: 'var(--slate-900)', marginBottom: 6 }}>
            Trusted third-party services
          </h2>
          <p style={{ fontSize: 14, color: 'var(--slate-500)', marginBottom: 24 }}>
            PropHealth is independent — we have no commercial relationship with any of these providers. Always get at least 3 quotes.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            {SERVICE_CATEGORIES.map(cat => (
              <div key={cat.id}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>{cat.icon}</span>
                  <h3 style={{ fontSize: 17, fontWeight: 500, color: 'var(--slate-900)', margin: 0 }}>{cat.title}</h3>
                </div>
                <p style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 14 }}>{cat.subtitle}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                  {cat.services.map((s, i) => <ServiceCard key={i} s={s} />)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{
          background: 'var(--slate-100)', borderRadius: 'var(--radius-md)',
          padding: '16px 20px', fontSize: 12, color: 'var(--slate-500)', lineHeight: 1.6,
        }}>
          <strong style={{ color: 'var(--slate-600)' }}>Disclaimer:</strong> Cost estimates are illustrative ranges based on industry data and may vary significantly depending on property size, location, and condition. Grant eligibility is subject to scheme rules which change regularly — always confirm with the scheme administrator or an independent adviser. PropHealth is not a financial adviser.
        </div>

      </main>
    </div>
  )
}
