import {hexBytes} from './digest'

export interface IdentityRef {
    identityDisplay?: string | null
    identityJson?: unknown
    identitySubName?: string | null
    identitySuper?: {identityDisplay?: string | null; identityJson?: unknown} | null
}

// the registration an account made itself answers for it whatever its
// judgements say, only a sub with no registration of its own borrows the label
// and the judgement of its super
export function identityLabel(acc: IdentityRef | undefined): string | undefined {
    if (!acc) return undefined
    const sup = acc.identitySuper
    if (acc.identityJson == null && acc.identitySubName != null && sup?.identityDisplay != null) return `${sup.identityDisplay}/${acc.identitySubName}`
    return acc.identityDisplay ?? undefined
}

export function identityInfoJson(acc: IdentityRef | undefined): unknown {
    return acc?.identityJson ?? acc?.identitySuper?.identityJson
}

// keys double as icon names and follow the runtime field order
const CHANNELS: [key: string, label: string][] = [
    ['web', 'Web'],
    ['email', 'Email'],
    ['matrix', 'Matrix'],
    ['github', 'GitHub'],
    ['x', 'X'],
    ['telegram', 'Telegram'],
    ['discord', 'Discord'],
]

const FIELDS: [key: string, label: string][] = [['display', 'Display'], ...CHANNELS]

export function dataText(d: unknown): string | null {
    const kind = (d as {__kind?: string})?.__kind
    const value = (d as {value?: string})?.value
    if (!kind || kind === 'None') return null
    if (kind.startsWith('Raw')) return value ? new TextDecoder().decode(hexBytes(value)) : null
    return value ? `${kind} ${value}` : kind
}

export function identityRows(json: unknown): [label: string, value: string | null][] {
    const info = (json as {info?: Record<string, unknown>})?.info
    return FIELDS.map(([key, label]) => [label, info ? dataText(info[key]) : null])
}

export interface IdentityChannel {
    key: string
    label: string
    value: string
}

// only what the account actually filled in
export function identityChannels(json: unknown): IdentityChannel[] {
    const info = (json as {info?: Record<string, unknown>})?.info
    if (!info) return []
    const rows: IdentityChannel[] = []
    for (const [key, label] of CHANNELS) {
        const value = dataText(info[key])
        if (value) rows.push({key, label, value})
    }
    return rows
}

// identity values are whatever the account holder put on chain, so the scheme
// is never taken from the value and handles are escaped into the path
function webHref(v: string): string | null {
    try {
        const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
        return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
    } catch {
        return null
    }
}

const handle = (v: string) => encodeURIComponent(v.replace(/^@/, ''))

export function channelHref(key: string, value: string): string | null {
    switch (key) {
        case 'web':
            return webHref(value)
        // the charset rules out the header separators, so the address goes in raw
        case 'email':
            return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value) ? `mailto:${value}` : null
        // a fragment on a fixed host cannot reach past the hash, matrix.to wants it unescaped
        case 'matrix':
            return `https://matrix.to/#/${value.startsWith('@') ? value : `@${value}`}`
        case 'github':
            return `https://github.com/${handle(value)}`
        case 'x':
            return `https://x.com/${handle(value)}`
        case 'telegram':
            return `https://t.me/${handle(value)}`
        default:
            return null
    }
}

// the events say what happened, the call says what was written. Only the calls
// carrying something the event leaves out are worth unpacking.
export function identityCallRows(method: string, args: unknown): [label: string, value: string][] {
    const a = (args ?? {}) as Record<string, unknown>
    switch (method) {
        case 'set_identity':
            return identityRows(a).filter((r): r is [string, string] => r[1] != null)
        case 'add_sub':
        case 'rename_sub': {
            const name = dataText(a.data)
            return name ? [['Sub name', name]] : []
        }
        default:
            return []
    }
}

export interface SubEntry {
    addr: string
    name: string | null
}

export function callSubs(method: string, args: unknown): SubEntry[] {
    if (method !== 'set_subs') return []
    const subs = ((args as {subs?: [string, unknown][]} | null)?.subs ?? []) as [string, unknown][]
    return subs.map(([addr, data]) => ({addr, name: dataText(data)}))
}

export interface IdentityJudgement {
    registrar: number
    kind: string
    fee?: string
}

export function identityJudgements(json: unknown): IdentityJudgement[] {
    const raw = (json as {judgements?: [number, {__kind: string; value?: string}][]})?.judgements ?? []
    return raw.map(([registrar, j]) => ({registrar, kind: j.__kind, fee: j.value}))
}
