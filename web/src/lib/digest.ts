const KIND: Record<number, string> = {0: 'Other', 4: 'Consensus', 5: 'Seal', 6: 'PreRuntime', 8: 'Runtime updated'}
const WITH_ENGINE = new Set([4, 5, 6])

export interface DigestLog {
    index: number
    kind: string
    engine: string | null
    data: string
}

export function hexBytes(hex: string): Uint8Array {
    const s = hex.startsWith('0x') ? hex.slice(2) : hex
    const out = new Uint8Array(s.length >> 1)
    for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16)
    return out
}

const hex = (b: Uint8Array) => '0x' + Array.from(b, x => x.toString(16).padStart(2, '0')).join('')

const ascii = (b: Uint8Array) => Array.from(b, x => (x >= 0x20 && x < 0x7f ? String.fromCharCode(x) : '.')).join('')

function compact(b: Uint8Array, at: number): {len: number; next: number} {
    const mode = b[at] & 3
    if (mode === 0) return {len: b[at] >> 2, next: at + 1}
    if (mode === 1) return {len: (b[at] | (b[at + 1] << 8)) >> 2, next: at + 2}
    if (mode === 2) return {len: ((b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0) >>> 2, next: at + 4}
    throw new Error('digest payload length out of range')
}

export function parseDigest(logs: string[]): DigestLog[] {
    return logs.map((log, index) => {
        try {
            const b = hexBytes(log)
            const kind = KIND[b[0]] ?? `Unknown ${b[0]}`
            if (b[0] === 8) return {index, kind, engine: null, data: '0x'}
            const engine = WITH_ENGINE.has(b[0]) ? ascii(b.subarray(1, 5)) : null
            const {len, next} = compact(b, engine ? 5 : 1)
            return {index, kind, engine, data: hex(b.subarray(next, next + len))}
        } catch {
            return {index, kind: 'Raw', engine: null, data: log}
        }
    })
}
