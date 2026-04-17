'use client'

import { useState } from 'react'
import Link from 'next/link'
import { NavBar } from '../components/NavBar'

type UserRole = 'buyer' | 'owner'

export default function PricingPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('buyer')

  const buyerPlans = [
    {
      name: 'Free',
      price: '£0',
      period: '/month',
      description: '',
      features: [
        'Stamp Duty & Lease Extension calculators',
        'Property buying checklists (FTB, Standard, BTL)',
        'Property risk scoring matrix',
        '3 automated property reports/month',
        'Flood risk, crime & broadband checks',
      ],
      cta: 'Get started free →',
      ctaUrl: '/signup',
      isPopular: false,
    },
    {
      name: 'Pro',
      price: '£19',
      period: '/month',
      yearlyPrice: '£149/year',
      yearlySavings: 'save 35%',
      features: [
        'Everything in Free, plus:',
        'Unlimited property reports',
        'EPC certificate lookup & history',
        'Save & compare up to 10 properties',
        'PDF report downloads',
        '10% off professional services',
        'Priority email support',
      ],
      cta: 'Start Pro →',
      ctaUrl: '/signup?plan=pro&role=buyer',
      isPopular: true,
    },
    {
      name: 'Enterprise',
      price: '£79',
      period: '/month',
      description: '',
      features: [
        'Everything in Pro, plus:',
        'Unlimited saved properties',
        'White-label branded PDF reports',
        'Bulk postcode API (1,000 checks/month)',
        'Team seats (up to 10 users)',
        'Dedicated account manager',
        'Volume discounts on professional services',
        'Estate agent & broker integrations',
      ],
      cta: 'Contact sales →',
      ctaUrl: 'mailto:hello@proppilot.co.uk',
      isPopular: false,
    },
  ]

  const ownerPlans = [
    {
      name: 'Free',
      price: '£0',
      period: '/month',
      description: '',
      features: [
        'Maintenance calendar (up to 5 tasks)',
        'Document vault (up to 3 documents)',
        'EPC rating check',
        'Stamp Duty calculator',
      ],
      cta: 'Get started free →',
      ctaUrl: '/signup',
      isPopular: false,
    },
    {
      name: 'Pro',
      price: '£9',
      period: '/month',
      yearlyPrice: '£79/year',
      yearlySavings: 'save 27%',
      features: [
        'Everything in Free, plus:',
        'Full maintenance calendar + email reminders',
        'Unlimited document vault',
        'Full property dashboard (value, EPC, mortgage)',
        'EPC improvement tracking & upgrade alerts',
        'Mortgage renewal reminders',
        'Gas safety & EICR renewal alerts',
        '10% off professional services',
        'Priority email support',
      ],
      cta: 'Start Pro →',
      ctaUrl: '/signup?plan=pro&role=owner',
      isPopular: true,
    },
    {
      name: 'Enterprise',
      price: '£29',
      period: '/month',
      description: '',
      features: [
        'Everything in Pro, plus:',
        'Up to 20 properties (landlords & portfolios)',
        'Rental compliance tracking',
        'Automated gas & EICR renewal reminders',
        'Multi-user access (5 seats)',
        'Exportable compliance reports',
        'Tenant management basics',
        'Priority phone support',
      ],
      cta: 'Contact sales →',
      ctaUrl: 'mailto:hello@proppilot.co.uk',
      isPopular: false,
    },
  ]

  const plans = selectedRole === 'buyer' ? buyerPlans : ownerPlans

  const navBar = (
    <NavBar
      rightSlot={
        <div style={{ display: 'flex', gap: 12 }}>
          <Link
            href="/login"
            style={{
              color: '#1D9E75',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            style={{
              background: '#1D9E75',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Sign up
          </Link>
        </div>
      }
      mobileItems={[
        { label: 'Sign in', href: '/login' },
        { label: 'Sign up', href: '/signup' },
      ]}
    />
  )

  return (
    <div style={{ background: '#f8f7f4', minHeight: '100vh' }}>
      {navBar}

      {/* Hero */}
      <div style={{ padding: '60px 24px', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: '#1a1917', marginBottom: 12 }}>
          Simple, transparent pricing
        </h1>
        <p style={{ fontSize: 18, color: '#666', margin: 0 }}>
          Start free. Upgrade when you need more.
        </p>
      </div>

      {/* Role toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 48, padding: '0 24px' }}>
        <button
          onClick={() => setSelectedRole('buyer')}
          style={{
            padding: '10px 20px',
            borderRadius: 20,
            border: selectedRole === 'buyer' ? 'none' : '1px solid #e2ddd6',
            background: selectedRole === 'buyer' ? '#1D9E75' : '#fff',
            color: selectedRole === 'buyer' ? '#fff' : '#666',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          🏡 HomeBuyer
        </button>
        <button
          onClick={() => setSelectedRole('owner')}
          style={{
            padding: '10px 20px',
            borderRadius: 20,
            border: selectedRole === 'owner' ? 'none' : '1px solid #e2ddd6',
            background: selectedRole === 'owner' ? '#1D9E75' : '#fff',
            color: selectedRole === 'owner' ? '#fff' : '#666',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          🏠 HomeOwner
        </button>
      </div>

      {/* Plans grid */}
      <div
        className="pp-grid-3"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px 60px',
        }}
      >
        {plans.map(plan => (
          <div
            key={plan.name}
            style={{
              position: 'relative',
              background: '#fff',
              border: plan.isPopular ? '2px solid #1D9E75' : '1px solid #e2ddd6',
              borderRadius: 16,
              padding: '32px 24px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Popular badge */}
            {plan.isPopular && (
              <div
                style={{
                  position: 'absolute',
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#1D9E75',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: 4,
                }}
              >
                Most popular
              </div>
            )}

            {/* Plan name */}
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1a1917', marginBottom: 8 }}>
              {plan.name}
            </h3>

            {/* Price */}
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 600, color: '#1a1917' }}>
                {plan.price}
              </span>
              <span style={{ fontSize: 14, color: '#666' }}>
                {plan.period}
              </span>
            </div>

            {/* Yearly price / savings */}
            {plan.yearlyPrice && (
              <p style={{ fontSize: 12, color: '#1D9E75', fontWeight: 500, margin: '8px 0 20px 0' }}>
                {plan.yearlyPrice} — {plan.yearlySavings}
              </p>
            )}

            {!plan.yearlyPrice && <div style={{ marginBottom: 20 }} />}

            {/* Features */}
            <ul
              style={{
                flex: 1,
                listStyle: 'none',
                padding: 0,
                margin: 0,
                marginBottom: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {plan.features.map((feature, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: 13,
                    color: feature.includes('Everything') ? '#999' : '#333',
                    fontWeight: feature.includes('Everything') ? 500 : 400,
                  }}
                >
                  {feature.includes('Everything') ? '— ' : '✓ '}
                  {feature}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Link
              href={plan.ctaUrl}
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '12px 16px',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'all 0.15s',
                background: plan.name === 'Free' ? '#fff' : plan.name === 'Pro' ? '#1D9E75' : '#1a1917',
                color: plan.name === 'Free' ? '#1D9E75' : '#fff',
                border: plan.name === 'Free' ? '1px solid #1D9E75' : 'none',
              }}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* Professional services add-ons */}
      <div style={{ background: '#fff', padding: '60px 24px', margin: '60px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: '#1a1917', marginBottom: 32, textAlign: 'center' }}>
            Professional Services Add-ons
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
            {[
              { icon: '⚖️', name: 'Title Register & Legal Checks', price: 'from £800' },
              { icon: '🏗️', name: 'Structural Survey (RICS Level 2/3)', price: 'from £500' },
              { icon: '🔥', name: 'Gas Safety Certificate (CP12)', price: 'from £60' },
              { icon: '⚡', name: 'EICR Electrical Report', price: 'from £150' },
            ].map(service => (
              <div
                key={service.name}
                style={{
                  padding: '24px',
                  background: '#f8f7f4',
                  borderRadius: 12,
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: 32, marginBottom: 12 }}>
                  {service.icon}
                </p>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1a1917', marginBottom: 8 }}>
                  {service.name}
                </h3>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#1D9E75', marginBottom: 8 }}>
                  {service.price}
                </p>
                <p style={{ fontSize: 12, color: '#666', margin: 0 }}>
                  10% off for Pro/Enterprise members
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 800, margin: '60px auto', padding: '0 24px 60px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: '#1a1917', marginBottom: 32, textAlign: 'center' }}>
          Frequently asked questions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {[
            {
              q: 'Can I switch between HomeBuyer and HomeOwner?',
              a: 'Yes, contact our support team to switch roles or manage multiple account types.',
            },
            {
              q: 'Is there a free trial for Pro?',
              a: 'Yes, we offer a 14-day free trial for Pro plans with no credit card required.',
            },
            {
              q: 'How do professional services work?',
              a: 'We connect you with vetted local professionals in your area. You choose who to work with and manage the engagement directly.',
            },
            {
              q: 'Can I cancel anytime?',
              a: 'Yes, monthly plans can be cancelled anytime with 1 click. No long-term contracts required.',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: '20px',
                background: '#fff',
                border: '1px solid #e2ddd6',
                borderRadius: 12,
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1a1917', marginBottom: 8 }}>
                {item.q}
              </h3>
              <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div
        style={{
          background: '#1D9E75',
          color: '#fff',
          padding: '40px 24px',
          textAlign: 'center',
          marginTop: 60,
        }}
      >
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, marginBottom: 12 }}>
          Ready to get started?
        </h2>
        <p style={{ fontSize: 16, marginBottom: 24 }}>
          Create your free account in minutes.
        </p>
        <Link
          href="/signup"
          style={{
            display: 'inline-block',
            background: '#fff',
            color: '#1D9E75',
            padding: '12px 28px',
            borderRadius: 12,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Get started free →
        </Link>
      </div>
    </div>
  )
}
