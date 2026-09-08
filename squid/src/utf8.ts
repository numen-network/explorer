const utf8 = new TextDecoder('utf-8', {fatal: true})

// null rather than undefined because undefined tells upsert to leave the
// column alone, which would strand the previous value
export function decodeUtf8(hex: unknown): string | null {
    if (typeof hex !== 'string' || !hex.startsWith('0x')) return null
    try {
        const text = utf8.decode(Buffer.from(hex.slice(2), 'hex'))
        return text.length > 0 ? text : null
    } catch {
        return null
    }
}
