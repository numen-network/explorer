import {Src} from '@subsquid/scale-codec'

export interface PowSeal {
    nonce: string
    work: string
}

export interface PowDigest {
    author?: string
    seal?: PowSeal
}

/** `engine` is the four byte consensus tag the runtime publishes for its seal. */
export function parsePowDigest(logs: string[], engine: Buffer): PowDigest {
    const out: PowDigest = {}
    for (const log of logs) {
        const bytes = Buffer.from(log.slice(2), 'hex')
        const type = bytes[0]
        if (type !== 5 && type !== 6) continue
        if (!bytes.subarray(1, 5).equals(engine)) continue
        const src = new Src(bytes.subarray(5))
        const payload = Buffer.from(src.bytes(src.compactLength()))
        if (type === 6) {
            if (payload.length !== 32) throw new Error('pow pre runtime digest is not an AccountId32')
            out.author = '0x' + payload.toString('hex')
        } else {
            if (payload.length !== 64) throw new Error('pow seal is not nonce plus work')
            // SCALE encodes U256 little endian, display convention is big endian hex
            const nonceBe = Buffer.from(payload.subarray(0, 32)).reverse()
            out.seal = {
                nonce: '0x' + nonceBe.toString('hex'),
                work: '0x' + payload.subarray(32, 64).toString('hex'),
            }
        }
    }
    return out
}
