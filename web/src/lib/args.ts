import {TypeKind} from '@subsquid/scale-codec'
import {hexToBytes} from '@noble/hashes/utils.js'
import {Runtime} from '@subsquid/substrate-runtime'
import type {Field, Type} from '@subsquid/substrate-runtime/lib/metadata'
import {fmtCount, fmtInt, fmtPct, textPreview, trackLabel} from '@/lib/format'
import type {AccountRef} from '@/lib/gql'
import {blake2_256} from '@/lib/hash'
import type {IdentityRef} from '@/lib/identity'
import {runtimeAt} from '@/lib/runtime'

/** A call argument the way a reader sees it, worked out from the runtime types. */
export type ArgNode =
    | {kind: 'none'}
    | {kind: 'plain'; text: string}
    | {kind: 'text'; text: string; bytes: number; hash?: string; full?: string}
    | {kind: 'hex'; hex: string; preimage?: Preimage; hash?: string; download?: string; calls?: CallNode[]; noted?: NotedPreimage}
    | {kind: 'account'; id: string; acc?: IdentityRef}
    | {kind: 'amount'; planck: string}
    | {kind: 'gasPrice'; wei: string}
    | {kind: 'time'; iso: string}
    | {kind: 'bounty'; index: number; title?: string | null}
    | {kind: 'spend'; id: string; index: number; referendum?: {index: number; title: string | null} | null}
    | {kind: 'registrar'; index: number; account?: AccountRef | null}
    | {kind: 'block'; height: number}
    | {kind: 'referendum'; index: number; title?: string | null}
    | {kind: 'delay'; blocks: number}
    | {kind: 'vote'; aye: boolean; conviction: number}
    | {kind: 'variant'; name: string; inner: ArgNode | null}
    | {kind: 'fields'; fields: [name: string, value: ArgNode][]}
    | {kind: 'list'; columns: string[]; rows: ArgNode[][]}
    | {kind: 'calls'; calls: CallNode[]}
    | {kind: 'listed'; label: string}

/** A call held in another call's args or bytes, in the preorder rows the call tree draws. */
export type CallNode = {address: number[]; pallet: string; method: string; args: unknown; view: ArgNode | null}

/** The referendum a hash serves and the extrinsic that noted it for that use, either can stand alone. */
export type NotedLine = {referendum?: {kind: 'text' | 'call'; index: number; title: string | null}; extrinsic?: string}

/** What the chain holds of a hash passed to a preimage call. */
export type NotedPreimage = {lines: NotedLine[]; content: ArgNode | null}

/** What a hash in the args stands for, when the index knows it as a preimage. */
export type Preimage = {referendum: number; title: string | null} & ({kind: 'text'; text: string} | {kind: 'proposal'; calls: CallNode[]})

// metadata keeps the source type name of every field, the typings leave it out
declare module '@subsquid/substrate-runtime/lib/metadata/types' {
    interface Field {
        typeName?: string
    }
}

const NONE: ArgNode = {kind: 'none'}
const CALL = 'numen_runtime::RuntimeCall'
const SPANS = new Set(['delay', 'after', 'period'])
const GAS_PRICES = new Set(['gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas', 'fee'])
const PER_THINGS: Record<string, number> = {
    'sp_arithmetic::per_things::Percent': 100,
    'sp_arithmetic::per_things::Permill': 1_000_000,
    'sp_arithmetic::per_things::Perbill': 1_000_000_000,
}

class Walker {
    private trackNames?: Map<number, string>

    constructor(readonly rt: Runtime) {}

    get types(): Type[] {
        return this.rt.description.types
    }

    path(ti: number) {
        return this.types[ti].path?.join('::')
    }

    // RuntimeCall and RuntimeEvent are both an enum of pallets over an enum of their own items
    itemFields(outer: number, pallet: string, name: string): Field[] {
        const all = this.types[outer]
        if (all.kind !== TypeKind.Variant) throw new Error(`${this.path(outer)} is not an enum`)
        const p = all.variants.find(v => v.name === pallet)
        const items = p && this.types[p.fields[0].type]
        const item = items?.kind === TypeKind.Variant ? items.variants.find(v => v.name === name) : undefined
        if (!item) throw new Error(`no ${pallet}.${name} in ${this.path(outer)} of spec ${this.rt.specVersion}`)
        return item.fields
    }

    callFields(pallet: string, method: string): Field[] {
        return this.itemFields(this.rt.description.call, pallet, method)
    }

    // a block number type also counts blocks, these fields hold a span rather than a height
    // every EVM number is a U256, only the field name tells an amount from a gas price
    // child bounty ids run apart from bounty ids and have no page of their own
    field(f: Field, value: any): ArgNode {
        if (value == null) return NONE
        const typeName = f.typeName ?? ''
        const name = f.name!
        if (SPANS.has(name) && /BlockNumber/.test(typeName)) return {kind: 'delay', blocks: Number(value)}
        if (/\bU256\b/.test(typeName) && name === 'value') return {kind: 'amount', planck: String(value)}
        if (/\bU256\b/.test(typeName) && GAS_PRICES.has(name)) return {kind: 'gasPrice', wei: String(value)}
        if (typeName === 'BountyIndex' && !name.startsWith('child')) return {kind: 'bounty', index: Number(value)}
        return this.node(f.type, value, f.typeName)
    }

    fields(fields: Field[], value: any): ArgNode {
        return {kind: 'fields', fields: fields.map(f => [f.name!, this.field(f, value?.[f.name!])])}
    }

    // a call the tree already lists under this one is only named, its own row shows what it was given
    callArgs(pallet: string, method: string, args: Record<string, any>, nested: boolean): ArgNode {
        return {
            kind: 'fields',
            fields: this.callFields(pallet, method).map(f => {
                const value = args[f.name!]
                if (!nested || !isCalls(this, f.type)) return [f.name!, this.arg(pallet, method, f, value)]
                return [f.name!, {kind: 'listed', label: Array.isArray(value) ? fmtCount(value.length, 'call') : `${value.__kind}.${value.value.__kind}`}]
            }),
        }
    }

    callRows(value: any, address: number[] = []): CallNode[] {
        const pallet = value.__kind
        const {__kind: method, ...args} = value.value
        const subcalls = this.callFields(pallet, method).flatMap(f => (isCalls(this, f.type) ? [args[f.name!]].flat() : []))
        const row = {address, pallet, method, args: briefArgs(briefCall({pallet, method, args: withoutBigInts(args)})), view: this.callArgs(pallet, method, args, subcalls.length > 0)}
        return [row, ...subcalls.flatMap((c, i) => this.callRows(c, [...address, i]))]
    }

    arg(pallet: string, method: string, f: Field, value: any): ArgNode {
        const node = this.field(f, value)
        const name = `${pallet}.${method}`
        if (node.kind === 'hex' && f.name === PREIMAGE_HASH_FIELDS[name]) return {...node, noted: {lines: [], content: null}}
        const summarized = f.name === SUMMARIZED_FIELDS[name]
        if (node.kind === 'none' || !(summarized || f.name === TEXT_OR_SUMMARY_FIELDS[name])) return node
        const hash = blake2_256(hexToBytes(value.slice(2)))
        const calls = name === NOTE_PREIMAGE ? this.decoded(value) : null
        if (node.kind === 'text' && !summarized && !calls) return {...node, hash}
        return {kind: 'hex', hex: summarizeHex(value), hash, ...(calls && {calls})}
    }

    node(ti: number, value: any, typeName = ''): ArgNode {
        if (value === null || value === undefined) return NONE
        const t = this.types[ti]
        const path = this.path(ti)
        if (path === CALL) return {kind: 'calls', calls: this.callRows(value)}
        if (path === 'pallet_conviction_voting::vote::Vote') return {kind: 'vote', aye: (value & 0x80) !== 0, conviction: value & 0x7f}
        if (path === 'sp_runtime::ModuleError') return {kind: 'plain', text: this.moduleError(value)}
        if (path && path in PER_THINGS) return {kind: 'plain', text: fmtPct(value, PER_THINGS[path])}
        if (/\b(ClassOf|TrackIdOf)\b/.test(typeName)) return {kind: 'plain', text: this.track(Number(value))}
        if (typeName === 'T::Moment') return {kind: 'time', iso: new Date(Number(value)).toISOString()}
        if (/\bTaskAddress\b/.test(typeName)) return {kind: 'fields', fields: [['block', {kind: 'block', height: Number(value[0])}], ['index', {kind: 'plain', text: fmtInt(value[1])}]]}
        if (/\bschedule::Period\b/.test(typeName)) return {kind: 'fields', fields: [['period', {kind: 'delay', blocks: Number(value[0])}], ['count', {kind: 'plain', text: fmtInt(value[1])}]]}
        switch (t.kind) {
            case TypeKind.Primitive:
                return this.primitive(t.primitive, value, typeName)
            case TypeKind.Compact:
            case TypeKind.Option:
                return this.node(t.type, value, typeName)
            case TypeKind.HexBytes:
                return bytes(value)
            case TypeKind.HexBytesArray:
                return path === 'sp_core::crypto::AccountId32' ? {kind: 'account', id: value} : {kind: 'hex', hex: value}
            case TypeKind.Sequence:
            case TypeKind.Array:
                return this.list(t.type, value)
            case TypeKind.Tuple:
                return {kind: 'fields', fields: t.tuple.map((x, i) => [String(i), this.node(x, value[i])])}
            case TypeKind.Composite:
                if (t.fields.every(f => f.name)) return this.fields(t.fields, value)
                if (t.fields.length === 1) return this.node(t.fields[0].type, value, t.fields[0].typeName)
                return {kind: 'fields', fields: t.fields.map((f, i) => [String(i), this.node(f.type, value[i], f.typeName)])}
            case TypeKind.Variant:
                return this.variant(ti, value)
            default:
                return {kind: 'plain', text: JSON.stringify(value)}
        }
    }

    primitive(primitive: string, value: any, typeName: string): ArgNode {
        if (primitive === 'Bool') return {kind: 'plain', text: String(value)}
        if (primitive === 'Str' || primitive === 'Char') return {kind: 'plain', text: value}
        if (/Balance/.test(typeName) || typeName === 'Votes') return {kind: 'amount', planck: String(value)}
        if (/BlockNumber/.test(typeName)) return {kind: 'block', height: Number(value)}
        if (/ReferendumIndex|PollIndex/.test(typeName)) return {kind: 'referendum', index: Number(value)}
        // the indexer keys a spend_local by its proposal index and a spend by its own
        if (typeName === 'ProposalIndex') return {kind: 'spend', id: `local-${value}`, index: Number(value)}
        if (typeName === 'SpendIndex') return {kind: 'spend', id: `spend-${value}`, index: Number(value)}
        if (typeName === 'RegistrarIndex') return {kind: 'registrar', index: Number(value)}
        return {kind: 'plain', text: fmtInt(value)}
    }

    variant(ti: number, value: any): ArgNode {
        const t = this.types[ti]
        if (t.kind !== TypeKind.Variant) throw new Error('not an enum')
        const v = t.variants.find(x => x.name === value.__kind)
        if (!v) throw new Error(`no variant ${value.__kind} in ${this.path(ti)}`)
        const [only] = v.fields
        // a delay counts blocks from now, it names no block
        const path = this.path(ti)
        if (path === 'frame_support::traits::schedule::DispatchTime' && v.name === 'After') return {kind: 'variant', name: v.name, inner: {kind: 'delay', blocks: value.value}}
        if (path === 'frame_support::traits::preimages::Bounded' && v.name === 'Inline') return {kind: 'variant', name: v.name, inner: this.inline(value.value)}
        if (path === 'pallet_identity::types::Data' && only) return {kind: 'variant', name: v.name, inner: bytes(value.value)}
        // Ok(()) carries nothing more than a bare Ok does
        const carried = only && this.types[only.type]
        const empty = carried?.kind === TypeKind.Tuple && carried.tuple.length === 0
        if (v.fields.length === 0 || (v.fields.length === 1 && empty)) return {kind: 'variant', name: v.name, inner: null}
        if (v.fields.length === 1 && !only.name) return {kind: 'variant', name: v.name, inner: this.node(only.type, value.value, only.typeName)}
        if (v.fields.every(f => f.name)) return {kind: 'variant', name: v.name, inner: this.fields(v.fields, value)}
        return {kind: 'variant', name: v.name, inner: {kind: 'fields', fields: v.fields.map((f, i) => [String(i), this.node(f.type, value.value[i], f.typeName)])}}
    }

    // track ids are keys into the Referenda.Tracks constant of the same runtime
    track(id: number): string {
        this.trackNames ??= new Map((this.rt.getConstant('Referenda.Tracks') as [number, {name: string}][]).map(([i, t]) => [i, t.name.replace(/\0+$/, '')]))
        const name = this.trackNames.get(id)
        if (name == null) throw new Error(`no track ${id} in spec ${this.rt.specVersion}`)
        return trackLabel(name)
    }

    // a module error is a pallet index and an index into that pallet's error enum,
    // the metadata of the runtime the block ran names both
    moduleError(err: {index: number; error: string}): string {
        const meta = this.rt.metadata
        if (meta.__kind !== 'V14') throw new Error(`unhandled metadata ${meta.__kind}`)
        const pallet = meta.value.pallets.find(p => p.index === err.index)
        const def = meta.value.lookup.types.find(t => t.id === pallet?.errors?.type)?.type.def
        const variant = def?.__kind === 'Variant' ? def.value.variants.find(v => v.index === parseInt(err.error.slice(2, 4), 16)) : undefined
        if (pallet == null || variant == null) throw new Error(`no module error ${err.error} in pallet ${err.index}`)
        return `${pallet.name}.${variant.name}`
    }

    // a proposal small enough to ride along with its referendum, still encoded
    inline(hex: string): ArgNode {
        const calls = this.decoded(hex)
        return calls ? {kind: 'calls', calls} : {kind: 'hex', hex}
    }

    decoded(hex: string): CallNode[] | null {
        let call
        try {
            call = this.rt.decodeCall(hex)
        } catch {
            return null
        }
        const calls = this.callRows(call)
        for (const nested of nodesOf(calls.map(c => c.view), 'hex')) nested.hex = briefHex(nested.hex)
        return calls
    }

    list(ti: number, value: any[]): ArgNode {
        if (value.length === 0) return NONE
        if (this.path(ti) === CALL) return {kind: 'calls', calls: value.flatMap((c, i) => this.callRows(c, [i]))}
        const t = this.types[ti]
        if (t.kind === TypeKind.Composite && t.fields.every(f => f.name)) {
            return {kind: 'list', columns: t.fields.map(f => f.name!), rows: value.map(v => t.fields.map(f => this.node(f.type, v[f.name!], f.typeName)))}
        }
        if (t.kind === TypeKind.Tuple) return {kind: 'list', columns: t.tuple.map(x => this.label(x)), rows: value.map(v => t.tuple.map((x, i) => this.node(x, v[i])))}
        return {kind: 'list', columns: [this.label(ti)], rows: value.map(v => [this.node(ti, v)])}
    }

    label(ti: number): string {
        const t = this.types[ti]
        return t.path?.at(-1) ?? (t.kind === TypeKind.Primitive ? t.primitive.toLowerCase() : 'value')
    }
}

const PRINTABLE = /^[^\p{Cc}]*$/u

function bytes(hex: string): ArgNode {
    if (hex === '0x') return NONE
    const raw = hexToBytes(hex.slice(2))
    let text: string
    try {
        text = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(raw)
    } catch {
        return {kind: 'hex', hex}
    }
    return PRINTABLE.test(text.replace(/[\n\r\t]/g, '')) ? {kind: 'text', text, bytes: raw.length} : {kind: 'hex', hex}
}

/**
 * The arguments of a call laid out by their runtime types, null when the
 * runtime it ran under is not among the known ones.
 */
export function describeArgs(call: {pallet: string; method: string; args: unknown; specVersion: number | null; nested: boolean}): ArgNode | null {
    const rt = call.args == null ? undefined : runtimeAt(call.specVersion)
    if (!rt) return null
    return new Walker(rt).callArgs(call.pallet, call.method, call.args as Record<string, any>, call.nested)
}

/** What an event carried, laid out the same way as call arguments. */
export function describeEvent(event: {pallet: string; method: string; args: unknown; specVersion: number | null}): ArgNode | null {
    const rt = event.args == null ? undefined : runtimeAt(event.specVersion)
    if (!rt) return null
    const w = new Walker(rt)
    const fields = w.itemFields(rt.description.event, event.pallet, event.method)
    if (fields.every(f => f.name)) return w.fields(fields, event.args)
    if (fields.length === 1) return w.node(fields[0].type, event.args, fields[0].typeName)
    return {kind: 'fields', fields: fields.map((f, i) => [String(i), w.node(f.type, (event.args as unknown[])[i], f.typeName)])}
}

/** The error an extrinsic failed with, named by the runtime it ran under, null when that runtime is not among the known ones. */
export function describeError(error: unknown, specVersion: number | null): ArgNode | null {
    const rt = error == null ? undefined : runtimeAt(specVersion)
    if (!rt) return null
    const w = new Walker(rt)
    const ti = w.types.findIndex((_, i) => w.path(i) === 'sp_runtime::DispatchError')
    if (ti < 0) throw new Error(`no DispatchError in spec ${rt.specVersion}`)
    return w.node(ti, error)
}

/** Every node of one kind in a set of args, for a lookup to mark up in place. */
export function nodesOf<K extends ArgNode['kind']>(nodes: (ArgNode | null)[], kind: K): Extract<ArgNode, {kind: K}>[] {
    const found: Extract<ArgNode, {kind: K}>[] = []
    const walk = (node: ArgNode | null): void => {
        if (!node) return
        if (node.kind === kind) found.push(node as Extract<ArgNode, {kind: K}>)
        if (node.kind === 'variant') walk(node.inner)
        if (node.kind === 'fields') node.fields.forEach(([, v]) => walk(v))
        if (node.kind === 'list') node.rows.forEach(row => row.forEach(walk))
        if (node.kind === 'calls') node.calls.forEach(c => walk(c.view))
        if (node.kind === 'hex') node.calls?.forEach(c => walk(c.view))
    }
    nodes.forEach(walk)
    return found
}

const LONG_HEX_CHARS = 2 + 2 * 16384

const NOTE_PREIMAGE = 'Preimage.note_preimage'

const PREIMAGE_HASH_FIELDS: Record<string, string> = {'Preimage.unnote_preimage': 'hash', 'Preimage.request_preimage': 'hash', 'Preimage.unrequest_preimage': 'hash', 'Referenda.set_metadata': 'maybeHash'}

const SUMMARIZED_FIELDS: Record<string, string> = {'Prime.upgrade': 'code', 'System.set_code': 'code', 'System.set_code_without_checks': 'code'}

const TEXT_OR_SUMMARY_FIELDS: Record<string, string> = {[NOTE_PREIMAGE]: 'bytes', 'System.remark': 'remark', 'System.remark_with_event': 'remark'}

const briefField = (pallet: string, method: string): string | undefined => SUMMARIZED_FIELDS[`${pallet}.${method}`] ?? TEXT_OR_SUMMARY_FIELDS[`${pallet}.${method}`]

const WHOLE_HEX_BYTES = 10

function summarizeHex(hex: string): string {
    const size = (hex.length - 2) / 2
    return `${size < WHOLE_HEX_BYTES ? hex : `${hex.slice(0, 10)}…${hex.slice(-8)}`} (${fmtCount(size, 'byte')})`
}

const briefHex = (hex: string) => (hex.length > LONG_HEX_CHARS ? summarizeHex(hex) : hex)

const summarizeField = <T extends Record<string, string>>(args: T, field: string) => ({...args, [field]: summarizeHex(args[field])})

// a batch holds its calls whole in its own args
function briefNestedCalls(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(briefNestedCalls)
    if (value == null || typeof value !== 'object') return value
    const call = value as {__kind?: string; value?: {__kind: string} & Record<string, string>}
    const field = call.__kind && call.value ? briefField(call.__kind, call.value.__kind) : undefined
    if (field) return {...call, value: summarizeField(call.value!, field)}
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, briefNestedCalls(v)]))
}

function briefCall({pallet, method, args}: {pallet: string; method: string; args: unknown}): unknown {
    const field = briefField(pallet, method)
    return field ? summarizeField(args as Record<string, string>, field) : briefNestedCalls(args)
}

const withoutBigInts = (value: unknown): unknown => JSON.parse(JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? String(v) : v)))

function briefArgs(value: unknown): unknown {
    if (typeof value === 'string') return value.startsWith('0x') ? briefHex(value) : value
    if (Array.isArray(value)) return value.map(briefArgs)
    if (value == null || typeof value !== 'object') return value
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, briefArgs(v)]))
}

/** A proposal's args as a page sends them, a runtime upgrade would otherwise put its whole wasm in the html. */
export function describeProposalArgs(call: Parameters<typeof describeArgs>[0]): ArgNode | null {
    const view = describeArgs(call)
    for (const node of nodesOf([view], 'hex')) node.hex = briefHex(node.hex)
    return view
}

function linkBytes(view: ArgNode | null, source: string): ArgNode | null {
    const href = (hash: string) => `/api/bytes?${source}&hash=${hash}`
    for (const node of nodesOf([view], 'hex')) if (node.hash) node.download = href(node.hash)
    for (const node of nodesOf([view], 'text')) {
        const preview = textPreview(node.text)
        if (preview === node.text) continue
        node.full = href(node.hash ?? blake2_256(new TextEncoder().encode(node.text)))
        node.text = preview
    }
    return view
}

/** A preimage's bytes drawn the way a note_preimage call draws them, downloads go through the preimage. */
export const describePreimage = (id: string, bytes: string, specVersion: number | null) => linkBytes(describeProposalArgs({pallet: 'Preimage', method: 'note_preimage', args: {bytes}, specVersion, nested: false}), `preimage=${id}`)

/** A note_preimage call's bytes drawn the way its own row does, minus the hash. */
export function describeNotedBytes(call: {id: string; bytes: string; specVersion: number}): ArgNode | null {
    const rt = runtimeAt(call.specVersion)
    if (!rt) return null
    const w = new Walker(rt)
    const field = w.callFields('Preimage', 'note_preimage').find(f => f.name === 'bytes')
    if (!field) throw new Error(`no note_preimage bytes in spec ${rt.specVersion}`)
    const node = linkBytes(w.arg('Preimage', 'note_preimage', field, call.bytes), `call=${call.id}`)
    if (node?.kind === 'hex' || node?.kind === 'text') delete node.hash
    return node
}

function decodeEmbedded(hex: unknown, specVersion: number | null): unknown {
    try {
        return runtimeAt(specVersion)?.decodeCall(hex as string)
    } catch {
        return undefined
    }
}

const hashesTo = (hex: string, hash: string) => /^0x([0-9a-f]{2})*$/i.test(hex) && blake2_256(hexToBytes(hex.slice(2))) === hash

/** The bytes in a call's args with that hash, an inline proposal or a preimage holds its call still encoded. */
export function findBytes(value: unknown, hash: string, specVersion: number | null): string | undefined {
    if (typeof value === 'string') return hashesTo(value, hash) ? value : undefined
    if (value == null || typeof value !== 'object') return undefined
    const {__kind, value: inner, bytes: noted} = value as {__kind?: string; value?: unknown; bytes?: unknown}
    const embedded = [__kind === 'Inline' ? decodeEmbedded(inner, specVersion) : undefined, decodeEmbedded(noted, specVersion)]
    for (const child of [...Object.values(value), ...embedded]) {
        const found = findBytes(child, hash, specVersion)
        if (found) return found
    }
    return undefined
}

/** Call rows with their args worked out, the way the call tree draws them. */
export const withCallViews = <T extends {id: string; pallet: string; method: string; args: unknown; block: {specVersion: number}; subcalls: unknown[]}>(rows: T[]) =>
    rows.map(c => ({...c, args: briefCall(c), view: linkBytes(describeArgs({...c, specVersion: c.block.specVersion, nested: c.subcalls.length > 0}), `call=${c.id}`)}))

/** Proposal calls with their args worked out, a call nests whatever follows it deeper in preorder. */
const linkedCallViews = <T extends {pallet: string; method: string; args: unknown; address: number[]}>(nodes: T[], specVersion: number | null, source: string) =>
    nodes.map((c, i) => ({...c, args: briefArgs(briefCall(c)), view: linkBytes(describeProposalArgs({...c, specVersion, nested: (nodes[i + 1]?.address.length ?? 0) > c.address.length}), source)}))

export const withProposalViews = <T extends {pallet: string; method: string; args: unknown; address: number[]}>(nodes: T[], specVersion: number | null, referendum: number) => linkedCallViews(nodes, specVersion, `referendum=${referendum}`)

/** Event rows with their args worked out, ready for a client table that cannot read the metadata. */
export const withEventViews = <T extends {pallet: string; method: string; args: unknown; block: {specVersion: number}}>(rows: T[]) => rows.map(e => ({...e, view: describeEvent({...e, specVersion: e.block.specVersion})}))

function isCalls(w: Walker, ti: number): boolean {
    const t = w.types[ti]
    return w.path(ti) === CALL || (t.kind === TypeKind.Sequence && w.path(t.type) === CALL)
}
