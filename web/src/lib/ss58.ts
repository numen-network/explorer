import {codec} from '@subsquid/ss58'

export function ss58Encode(hex: string, prefix: number): string {
    return codec(prefix).encode(hex)
}

export function ss58TryDecode(s: string, prefix: number): string | null {
    try {
        return codec(prefix).decode(s)
    } catch {
        return null
    }
}
