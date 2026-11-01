import {TypeKind} from '@subsquid/scale-codec'
import {Runtime} from '@subsquid/substrate-runtime'
import {runtimeSpecVersions, runtimeVersions, type RuntimeVersionRow} from '@/lib/gql'

const runtimes = new Map<number, Runtime>()

export function addRuntimes(rows: RuntimeVersionRow[]): void {
    for (const row of rows) runtimes.set(row.specVersion, new Runtime(row, row.metadata))
}

// the sync readers below only see what this has loaded, every page awaits it first
export async function loadRuntimes(): Promise<void> {
    const missing = (await runtimeSpecVersions()).filter(spec => !runtimes.has(spec))
    if (missing.length > 0) addRuntimes(await runtimeVersions(missing))
}

export function runtimeAt(specVersion: number | null): Runtime | undefined {
    return specVersion == null ? undefined : runtimes.get(specVersion)
}

export function knownRuntime(specVersion: number): Runtime {
    const rt = runtimeAt(specVersion)
    if (!rt) throw new Error(`no metadata for spec ${specVersion}`)
    return rt
}

function constantAt(specVersion: number, name: `${string}.${string}`): unknown {
    return knownRuntime(specVersion).getConstant(name)
}

// the events a pallet declares, in the order its metadata lists them
export function palletEvents(specVersion: number, pallet: string): string[] {
    const {types, event} = knownRuntime(specVersion).description
    const all = types[event]
    const own = all.kind === TypeKind.Variant ? all.variants.find(v => v.name === pallet) : undefined
    const list = own && types[own.fields[0].type]
    if (list?.kind !== TypeKind.Variant) throw new Error(`spec ${specVersion} declares no ${pallet} events`)
    return list.variants.map(v => v.name)
}

// a block count constant such as Referenda.UndecidingTimeout, as the runtime at that version declares it
export function blocksConstant(specVersion: number, name: `${string}.${string}`): number {
    const value = constantAt(specVersion, name)
    if (typeof value !== 'number') throw new Error(`${name} of spec ${specVersion} is not a block count`)
    return value
}

// an amount constant such as BlockReward.InitialReward, in planck
export function balanceConstant(specVersion: number, name: `${string}.${string}`): bigint {
    const value = constantAt(specVersion, name)
    if (typeof value !== 'bigint') throw new Error(`${name} of spec ${specVersion} is not an amount`)
    return value
}
