import {bytesToHex, hexToBytes} from '@noble/hashes/utils.js'
import {Src} from '@subsquid/scale-codec'

const KIND: Record<number, string> = {0: 'Other', 4: 'Consensus', 5: 'Seal', 6: 'PreRuntime', 8: 'Runtime updated'}
const WITH_ENGINE = new Set([4, 5, 6])

export interface DigestLog {
    index: number
    kind: string
    engine: string | null
    data: string
}

const ascii = (b: Uint8Array) => Array.from(b, x => (x >= 0x20 && x < 0x7f ? String.fromCharCode(x) : '.')).join('')

export function parseDigest(logs: string[]): DigestLog[] {
    return logs.map((log, index) => {
        try {
            const b = hexToBytes(log.slice(2))
            const kind = KIND[b[0]] ?? `Unknown ${b[0]}`
            if (b[0] === 8) return {index, kind, engine: null, data: '0x'}
            const engine = WITH_ENGINE.has(b[0]) ? ascii(b.subarray(1, 5)) : null
            const src = new Src(b.subarray(engine ? 5 : 1))
            return {index, kind, engine, data: '0x' + bytesToHex(src.bytes(src.compactLength()))}
        } catch {
            return {index, kind: 'Raw', engine: null, data: log}
        }
    })
}
