import type { Metadata } from 'next'
import './globals.css'
import { AppProvider } from '@/components/AppProvider'
import { AdBoard } from '@/components/AdBoard'
import { Nav } from '@/components/Nav'
import { MatchTicker } from '@/components/MatchTicker'
import SiteBackground from '@/components/SiteBackground'
import { PageLoader } from '@/components/PageLoader'
import { TxLineFeed } from '@/components/TxLineFeed'
import { ReownProvider } from '@/components/ReownProvider'

export const metadata: Metadata = {
  title: 'WatchItLive — World Cup 2026 · Live Odds · Sharp Signals',
  description: 'Live World Cup 2026 odds, sharp money signals, and AI match predictions. Every signal anchored on Solana.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="crt-flicker min-h-screen flex flex-col">
        <SiteBackground />
        <div className="crt-overlay" />
        <ReownProvider>
          <AppProvider>
            <PageLoader />
            <div className="relative z-[1] flex flex-col min-h-screen">
              <Nav />
              <MatchTicker />
              <TxLineFeed />
              <main className="flex-1">{children}</main>
              <AdBoard />
            </div>
          </AppProvider>
        </ReownProvider>
      </body>
    </html>
  )
}
