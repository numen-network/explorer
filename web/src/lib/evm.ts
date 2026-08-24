import {blake2b} from '@noble/hashes/blake2.js'
import {bytesToHex, hexToBytes} from '@noble/hashes/utils.js'

export function isH160(s: string): boolean {
    return /^0x[0-9a-fA-F]{40}$/.test(s)
}

export function isH256(s: string): boolean {
    return /^0x[0-9a-fA-F]{64}$/.test(s)
}

const TX_TYPE_LABEL: Record<number, string> = {
    0: 'Legacy',
    1: 'EIP-2930',
    2: 'EIP-1559',
    4: 'EIP-7702',
}

export function evmTxTypeLabel(t: number): string {
    return TX_TYPE_LABEL[t] ?? `Type ${t}`
}

export function evmMappedAccount(h160: string): string {
    const prefix = new TextEncoder().encode('evm:')
    const addr = hexToBytes(h160.slice(2))
    const data = new Uint8Array(prefix.length + addr.length)
    data.set(prefix)
    data.set(addr, prefix.length)
    return '0x' + bytesToHex(blake2b(data, {dkLen: 32}))
}
