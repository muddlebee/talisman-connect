import type { PolkadotSigner } from 'polkadot-api/signer'

import { WalletError } from './lib/errors/BaseWalletError'

export type SubscriptionFn = (
  accounts: WalletAccount[] | undefined,
) => void | Promise<void>

export interface WalletLogoProps {
  // Logo url
  src: string
  // Alt for the Logo url
  alt: string
}

export interface WalletAccount {
  address: string
  source: string
  name?: string
  wallet?: Wallet
  // The signer is now typed as PolkadotSigner from PAPI for better type safety
  signer?: PolkadotSigner
}

interface WalletData {
  // The name of the wallet extension. Should match `WalletAccount.source`
  extensionName: string
  // Display name for the wallet extension
  title: string
  // Message to display if wallet extension is not installed
  noExtensionMessage?: string
  // The URL to install the wallet extension
  installUrl: string
  // The wallet logo
  logo: WalletLogoProps
}

interface WalletExtension {
  installed: boolean | undefined

  // The raw extension object which will have everything a dapp developer needs.
  // Refer to a specific wallet's extension documentation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extension: any

  // The raw signer object for convenience. Usually the implementer can derive this from the extension object.
  // For Polkadot API (PAPI), this is a PolkadotSigner instance
  signer: PolkadotSigner | any
}

// Updated Signer interface that aligns with PAPI's signer capabilities
interface Signer {
  // Legacy sign function - maintained for backward compatibility
  sign?: (address: string, payload: string) => unknown
}

interface Connector {
  enable: (dappName: string) => unknown

  // Get accounts function - made compatible with existing code by keeping the parameter
  getAccounts: (anyType?: boolean) => Promise<WalletAccount[]>

  // The subscribe to accounts function
  subscribeAccounts: (callback: SubscriptionFn) => unknown
}

interface WalletErrors {
  transformError: (err: WalletError) => Error
}

export interface Wallet
  extends WalletData,
    WalletExtension,
    Connector,
    Signer,
    WalletErrors {}
