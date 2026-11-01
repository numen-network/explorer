import {TypeKind} from '@subsquid/scale-codec'
import type {Runtime} from '@subsquid/substrate-runtime'
import {fmtBalance, fmtInt} from '@/lib/format'

export type Change = 'Added' | 'Removed' | 'Changed'

export interface ConstantRow {
    name: string
    doc: string
    previous: string | null
    next: string | null
}

export interface PalletRow {
    name: string
    change: Change
    calls: number
}

export interface CallRow {
    name: string
    doc: string
    change: Change
    args: string[]
}

export interface RuntimeDiff {
    constants: ConstantRow[]
    pallets: PalletRow[]
    calls: CallRow[]
}

interface CallShape {
    doc: string
    args: string[]
}

const firstSentence = (docs: string[] = []) => docs.map(line => line.trim()).filter(Boolean).join(' ').match(/^.*?[.!](?=\s|$)|^.*$/)![0]

// the wasm's version sits in the Spec table, this constant only repeats it
const SPEC_CONSTANT = 'System.Version'

function palletCalls(rt: Runtime): Map<string, Map<string, CallShape>> {
    const {types, call} = rt.description
    const pallets = types[call]
    if (pallets.kind !== TypeKind.Variant) throw new Error(`spec ${rt.specVersion} has no call enum`)
    return new Map(
        pallets.variants.map(pallet => {
            const list = types[pallet.fields[0].type]
            if (list.kind !== TypeKind.Variant) throw new Error(`${pallet.name} calls of spec ${rt.specVersion} are not an enum`)
            return [pallet.name, new Map(list.variants.map(v => [v.name, {doc: firstSentence(v.docs), args: v.fields.map(f => f.name ?? '')}]))]
        })
    )
}

// a pallet with neither calls nor constants still sits in this list
function palletNames(rt: Runtime): string[] {
    if (rt.metadata.__kind !== 'V14') throw new Error(`spec ${rt.specVersion} has metadata ${rt.metadata.__kind}`)
    return rt.metadata.value.pallets.map(p => p.name)
}

const isU128 = (rt: Runtime, ti: number) => {
    const type = rt.description.types[ti]
    return type.kind === TypeKind.Primitive && type.primitive === 'U128'
}

// every u128 constant of the runtime is an amount, in or out of an Option
function isAmount(rt: Runtime, ti: number): boolean {
    const type = rt.description.types[ti]
    return isU128(rt, ti) || (type.kind === TypeKind.Option && isU128(rt, type.type))
}

function constantText(rt: Runtime, name: `${string}.${string}`, ti: number, decimals: number, symbol: string): string {
    const value: unknown = rt.getConstant(name)
    if (value == null) return 'None'
    if (typeof value === 'bigint' && isAmount(rt, ti)) return fmtBalance(value, decimals, symbol)
    if (typeof value === 'bigint' || typeof value === 'number') return fmtInt(value)
    return JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? String(v) : v))
}

function constantRows(previous: Runtime, next: Runtime, decimals: number, symbol: string): ConstantRow[] {
    const read = (rt: Runtime) =>
        new Map(
            Object.entries(rt.description.constants).flatMap(([pallet, items]) =>
                Object.entries(items).map(([item, c]) => {
                    const name = `${pallet}.${item}` as const
                    return [name, {text: constantText(rt, name, c.type, decimals, symbol), doc: firstSentence(c.docs)}] as const
                })
            )
        )
    const [before, after] = [read(previous), read(next)]
    return [...new Set([...before.keys(), ...after.keys()])]
        .filter(name => name !== SPEC_CONSTANT && before.get(name)?.text !== after.get(name)?.text)
        .map(name => ({name, doc: (after.get(name) ?? before.get(name))!.doc, previous: before.get(name)?.text ?? null, next: after.get(name)?.text ?? null}))
}

function callRows(before: Map<string, Map<string, CallShape>>, after: Map<string, Map<string, CallShape>>): CallRow[] {
    return [...new Set([...before.keys(), ...after.keys()])].flatMap(pallet => {
        const [was, is] = [before.get(pallet) ?? new Map<string, CallShape>(), after.get(pallet) ?? new Map<string, CallShape>()]
        return [...new Set([...was.keys(), ...is.keys()])].flatMap((method): CallRow[] => {
            const [old, now] = [was.get(method), is.get(method)]
            const row = (now ?? old)!
            const change: Change | null = !old ? 'Added' : !now ? 'Removed' : old.args.join() !== now.args.join() ? 'Changed' : null
            return change ? [{name: `${pallet}.${method}`, doc: row.doc, change, args: row.args}] : []
        })
    })
}

export function runtimeDiff(previous: Runtime, next: Runtime, decimals: number, symbol: string): RuntimeDiff {
    const [before, after] = [palletCalls(previous), palletCalls(next)]
    const [was, is] = [palletNames(previous), palletNames(next)]
    const pallets = [
        ...is.filter(name => !was.includes(name)).map((name): PalletRow => ({name, change: 'Added', calls: after.get(name)?.size ?? 0})),
        ...was.filter(name => !is.includes(name)).map((name): PalletRow => ({name, change: 'Removed', calls: before.get(name)?.size ?? 0})),
    ]
    return {constants: constantRows(previous, next, decimals, symbol), pallets, calls: callRows(before, after)}
}
