import {hexToBytes} from '@noble/hashes/utils.js'

export interface IdentityRef {
    identityDisplay?: string | null
    identityJson?: unknown
    identitySubName?: string | null
    identitySubData?: unknown
    identitySuper?: {identityDisplay?: string | null; identityJson?: unknown} | null
    username?: string | null
}

export const subName = (acc: IdentityRef) => acc.identitySubName ?? dataText(acc.identitySubData)

export function subLabel(acc: IdentityRef): string | undefined {
    const sup = acc.identitySuper?.identityDisplay
    const sub = subName(acc)
    return sup != null && sub != null ? `${sup}/${sub}` : undefined
}

// the registration an account made itself answers for it whatever its
// judgements say, only a sub with no registration of its own borrows the label
// and the judgement of its super. an account neither names goes by its username
export function identityLabel(acc: IdentityRef | undefined): string | undefined {
    if (!acc) return undefined
    return (acc.identityJson == null ? subLabel(acc) : undefined) ?? acc.identityDisplay ?? acc.username ?? undefined
}

export function identityInfoJson(acc: IdentityRef | undefined): unknown {
    return acc?.identityJson ?? acc?.identitySuper?.identityJson
}

// order follows the runtime struct
const FIELDS: [key: string, label: string][] = [
    ['display', 'Display'],
    ['avatar', 'Avatar'],
    ['bio', 'Bio'],
    ['web', 'Web'],
    ['email', 'Email'],
    ['github', 'GitHub'],
    ['matrix', 'Matrix'],
    ['x', 'X'],
    ['telegram', 'Telegram'],
    ['discord', 'Discord'],
]

export const hexText = (hex: string) => new TextDecoder().decode(hexToBytes(hex.slice(2)))

// sub account names are the last thing still wearing pallet_identity's Data
export function dataText(d: unknown): string | null {
    const kind = (d as {__kind?: string})?.__kind
    const value = (d as {value?: string})?.value
    if (!kind || kind === 'None') return null
    if (kind.startsWith('Raw')) return value ? hexText(value) : null
    return value ? `${kind} ${value}` : kind
}

// every identity field is bare utf-8 bytes, so an empty one reads as 0x
export function fieldText(v: unknown): string | null {
    if (typeof v !== 'string' || v === '0x') return null
    return hexText(v) || null
}

export const infoField = (json: unknown, key: string) => fieldText((json as {info?: Record<string, unknown>})?.info?.[key])

// the wallet takes the first line of a bio as its short bio and the rest as the full one
export function splitBio(json: unknown) {
    const [short = '', ...rest] = (infoField(json, 'bio') ?? '').split('\n')
    return {short, full: rest.join('\n').trim()}
}

export interface IdentityField {
    key: string
    label: string
    value: string | null
}

// every field in runtime order, the empty ones included
export function identityRows(json: unknown): IdentityField[] {
    const info = (json as {info?: Record<string, unknown>})?.info
    return FIELDS.map(([key, label]) => ({key, label, value: info ? fieldText(info[key]) : null}))
}

// only what the account actually filled in
export const identityFields = (json: unknown) => identityRows(json).filter((f): f is IdentityField & {value: string} => f.value != null)

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
            return identityFields(a).map(f => [f.label, f.value])
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

export const GOOD_JUDGEMENTS = ['Reasonable', 'KnownGood']
export const BAD_JUDGEMENTS = ['Erroneous', 'LowQuality']

export function identityJudgements(json: unknown): IdentityJudgement[] {
    const raw = (json as {judgements?: [number, {__kind: string; value?: string}][]})?.judgements ?? []
    return raw.map(([registrar, j]) => ({registrar, kind: j.__kind, fee: j.value}))
}
