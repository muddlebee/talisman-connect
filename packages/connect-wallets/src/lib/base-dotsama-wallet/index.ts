import type { InjectedExtension as PapiInjectedExtension } from 'polkadot-api/pjs-signer'
import type { PolkadotSigner } from 'polkadot-api/signer'
import {
  connectInjectedExtension,
  getInjectedExtensions,
} from 'polkadot-api/pjs-signer'

import { SubscriptionFn, Wallet, WalletAccount } from '../../types'
import { AuthError } from '../errors/AuthError'
import { WalletError } from '../errors/BaseWalletError'
import { NotInstalledError } from '../errors/NotInstalledError'

// TODO: Create a proper BaseWallet class to offload common checks
export class BaseDotsamaWallet implements Wallet {
  extensionName = ''
  title = ''
  installUrl = ''
  logo = {
    src: '',
    alt: '',
  }

  protected _extension?: PapiInjectedExtension
  protected _signer?: PolkadotSigner

  get extension() {
    return this._extension
  }

  get signer() {
    return this._signer
  }

  get installed() {
    const extensions = getInjectedExtensions()
    return extensions.includes(this.extensionName)
  }

  transformError = (err: Error): WalletError | Error => {
    if (err.message.includes('pending authorization request')) {
      return new AuthError(err.message, this)
    }
    return err
  }

  enable = async (dappName: string) => {
    if (!dappName) {
      throw new Error('MissingParamsError: Dapp name is required.')
    }
    if (!this.installed) {
      throw new NotInstalledError(
        `Refresh the browser if ${this.title} is already installed.`,
        this,
      )
    }

    try {
      const extension = await connectInjectedExtension(this.extensionName)
      const accounts = await extension.getAccounts()

      if (accounts.length === 0) {
        throw new NotInstalledError(`No accounts found in ${this.title}`, this)
      }

      this._extension = extension
      this._signer = accounts[0].polkadotSigner
    } catch (err) {
      throw this.transformError(err as WalletError)
    }
  }

  // @ts-ignore - Parameter required for compatibility with interface
  getAccounts = async (anyType?: boolean): Promise<WalletAccount[]> => {
    if (!this._extension || !this._signer) {
      throw new NotInstalledError(
        `The 'Wallet.enable(dappname)' function should be called first.`,
        this,
      )
    }

    const accounts = await this._extension.getAccounts()
    return accounts.map((account) => ({
      address: account.address,
      name: account.name,
      source: this.extensionName,
      wallet: this,
      signer: this._signer,
    }))
  }

  subscribeAccounts = async (callback: SubscriptionFn) => {
    if (!this._extension || !this._signer) {
      throw new NotInstalledError(
        `The 'Wallet.enable(dappname)' function should be called first.`,
        this,
      )
    }

    // PAPI doesn't have a direct subscription method yet
    // For now, we'll implement a basic polling mechanism
    const pollInterval = 1000 // 1 second
    let lastAccounts: string[] = []

    const interval = setInterval(async () => {
      const accounts = await this._extension!.getAccounts()
      const currentAddresses = accounts.map((a) => a.address)

      if (JSON.stringify(lastAccounts) !== JSON.stringify(currentAddresses)) {
        lastAccounts = currentAddresses
        const accountsWithWallet = accounts.map((account) => ({
          address: account.address,
          name: account.name,
          source: this.extensionName,
          wallet: this,
          signer: this._signer,
        }))
        callback(accountsWithWallet)
      }
    }, pollInterval)

    return () => clearInterval(interval)
  }
}
