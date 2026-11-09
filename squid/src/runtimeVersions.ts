import type {RpcClient} from '@subsquid/rpc-client'
import type {BlockHeader} from '@subsquid/substrate-processor'
import type {Store} from '@subsquid/typeorm-store'
import {In} from 'typeorm'
import {RuntimeVersion} from './model'

export async function readNewRuntimeVersions(store: Store, headers: BlockHeader[], rpc: RpcClient): Promise<RuntimeVersion[]> {
    const first = new Map<number, BlockHeader>()
    for (const h of headers) if (!first.has(h._runtime.specVersion)) first.set(h._runtime.specVersion, h)
    const known = await store.findBy(RuntimeVersion, {specVersion: In([...first.keys()])})
    for (const {specVersion} of known) first.delete(specVersion)
    return Promise.all([...first.values()].map(h => readRuntimeVersion(h, rpc)))
}

// a block runs the code its parent left, the genesis block the code it holds
async function readRuntimeVersion(h: BlockHeader, rpc: RpcClient): Promise<RuntimeVersion> {
    const ranOn = h.height === 0 ? h.hash : h.parentHash
    const [version, metadata] = await Promise.all([rpc.call('state_getRuntimeVersion', [ranOn]), rpc.call('state_getMetadata', [ranOn])])
    return new RuntimeVersion({
        id: String(h._runtime.specVersion),
        specVersion: h._runtime.specVersion,
        specName: version.specName,
        implName: version.implName,
        implVersion: version.implVersion,
        transactionVersion: version.transactionVersion,
        firstBlock: h.height,
        metadata: Buffer.from(metadata.slice(2), 'hex'),
    })
}
