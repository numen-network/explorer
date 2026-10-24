import {Runtime} from '@subsquid/substrate-runtime'
import {specVersionsJsonl} from '@/lib/specVersions'

let runtimes: Map<number, Runtime> | undefined

export function runtimeAt(specVersion: number | null): Runtime | undefined {
    runtimes ??= new Map(
        specVersionsJsonl()
            .split('\n')
            .filter(Boolean)
            .map(line => JSON.parse(line))
            .map(v => [v.specVersion, new Runtime(v, v.metadata)])
    )
    return specVersion == null ? undefined : runtimes.get(specVersion)
}

// a block count constant such as Referenda.UndecidingTimeout, as the runtime at that version declares it
export function blocksConstant(specVersion: number, name: `${string}.${string}`): number {
    const rt = runtimeAt(specVersion)
    if (!rt) throw new Error(`no metadata for spec ${specVersion}`)
    const value = rt.getConstant(name)
    if (typeof value !== 'number') throw new Error(`${name} of spec ${specVersion} is not a block count`)
    return value
}
