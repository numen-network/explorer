import {hexToBytes} from '@noble/hashes/utils.js'
import {blake2_256} from './hash'
import {variantName, variantValue} from './variant'

export function isH160(s: string): boolean {
    return /^0x[0-9a-fA-F]{40}$/.test(s)
}

export function isH256(s: string): boolean {
    return /^0x[0-9a-fA-F]{64}$/.test(s)
}

// the TransactionV2 variant names read as the eips they implement
export const evmTxTypeLabel = (t: string) => t.replace(/^EIP(\d+)$/, 'EIP-$1')

/** What a failed call reported below its ExitReason variant, the ExitError or ExitFatal name. */
export const exitDetail = (reason: unknown) => variantName(variantValue(reason))

/** The name a failed transaction goes by, its ExitReason variant under Frontier and Revert under revive, which reports EthExtrinsicRevert alone. */
export const evmFailure = (tx: {exitReason: unknown}) => (tx.exitReason == null ? 'Revert' : variantName(tx.exitReason))

// Frontier hashes an H160 into its account one way. revive pads it with 0xEE
// unless OriginalAccount maps it back to an SS58 account, which only the index knows
export function evmMappedAccount(h160: string, revive: boolean): string {
    if (revive) return h160 + 'ee'.repeat(12)
    const prefix = new TextEncoder().encode('evm:')
    const addr = hexToBytes(h160.slice(2))
    const data = new Uint8Array(prefix.length + addr.length)
    data.set(prefix)
    data.set(addr, prefix.length)
    return blake2_256(data)
}
