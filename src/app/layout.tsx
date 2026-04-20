import type { Metadata } from 'next'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'PropHealth — AI Home Intelligence for UK Homeowners',
  description:
    'Track your property value, plan your EPC upgrade, predict maintenance costs, and never miss a remortgage window again.',
  keywords: ['EPC upgrade', 'UK homeowner', 'remortgage', 'property value', 'home maintenance'],
  openGraph: {
    title: 'PropHealth — AI Home Intelligence for UK Homeowners',
    description: 'Your home is your biggest asset. Start treating it like one.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
