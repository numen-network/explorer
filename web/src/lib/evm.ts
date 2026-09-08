import {blake2b} from '@noble/hashes/blake2.js'
import {bytesToHex, hexToBytes} from '@noble/hashes/utils.js'
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

export function evmMappedAccount(h160: string): string {
    const prefix = new TextEncoder().encode('evm:')
    const addr = hexToBytes(h160.slice(2))
    const data = new Uint8Array(prefix.length + addr.length)
    data.set(prefix)
    data.set(addr, prefix.length)
    return '0x' + bytesToHex(blake2b(data, {dkLen: 32}))
}
