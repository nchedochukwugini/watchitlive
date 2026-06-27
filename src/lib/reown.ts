import { createAppKit } from '@reown/appkit'
import { SolanaAdapter } from '@reown/appkit-adapter-solana'
import { solana, solanaDevnet } from '@reown/appkit/networks'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
} from '@solana/wallet-adapter-wallets'

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID!

const solanaAdapter = new SolanaAdapter({
  wallets: [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new CoinbaseWalletAdapter(),
  ],
})

export const appKit = createAppKit({
  adapters: [solanaAdapter],
  projectId,
  networks: [solanaDevnet, solana],
  defaultNetwork: solanaDevnet,
  metadata: {
    name:        'WatchItLive',
    description: 'World Cup 2026 · Live Odds · Sharp Signals · On Solana',
    url:         'https://watchitlive.vercel.app',
    icons:       ['https://watchitlive.vercel.app/icon.svg'],
  },
  features: {
    analytics: false,
    email:     true,
    socials:   ['google'],
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent':           '#00ff88',
    '--w3m-background-color': '#0a0e1a',
    '--w3m-font-family':      'VT323, monospace',
    '--w3m-border-radius-master': '0px',
  },
})

export default appKit
