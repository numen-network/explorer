import type {RpcClient} from '@subsquid/rpc-client'
import type {BlockHeader} from '@subsquid/substrate-processor'
import type {Store} from '@subsquid/typeorm-store'
import {In} from 'typeorm'
import {RuntimeVersion} from './model'

export async function readNewRuntimeVersions(store: Store, headers: BlockHeader[], rpc: RpcClient): Promise<RuntimeVersion[]> {
    const first = new Map<number, BlockHeader>()
    for (const h of headers) if (!first.has(h.specVersion)) first.set(h.specVersion, h)
    const known = await store.findBy(RuntimeVersion, {specVersion: In([...first.keys()])})
    for (const {specVersion} of known) first.delete(specVersion)
    return Promise.all([...first.values()].map(h => readRuntimeVersion(h, rpc)))
}

async function readRuntimeVersion(h: BlockHeader, rpc: RpcClient): Promise<RuntimeVersion> {
    const [version, metadata] = await Promise.all([rpc.call('state_getRuntimeVersion', [h.hash]), rpc.call('state_getMetadata', [h.hash])])
    return new RuntimeVersion({
        id: String(h.specVersion),
        specVersion: h.specVersion,
        specName: version.specName,
        implName: version.implName,
        implVersion: version.implVersion,
        transactionVersion: version.transactionVersion,
        firstBlock: h.height,
        metadata: Buffer.from(metadata.slice(2), 'hex'),
    })
}
