import {parentPort, workerData} from 'node:worker_threads'
import {get_runtime_version, run_task} from '@acala-network/chopsticks-executor'
import {Src} from '@subsquid/scale-codec'
import {Runtime} from '@subsquid/substrate-runtime'
import {bytesToHex} from '@noble/hashes/utils.js'
import type {ProposedRuntime, StateRead, WorkerMessage} from './runtimeCode'

const post = (msg: WorkerMessage) => parentPort!.postMessage(msg)

const pending = new Map<number, (value: string | null) => void>()
let nextId = 0

parentPort!.on('message', ({id, value}: {id: number; value: string | null}) => {
    pending.get(id)!(value)
    pending.delete(id)
})

function readState(read: Omit<StateRead, 'id'>): Promise<string | undefined> {
    const id = nextId++
    return new Promise(resolve => {
        pending.set(id, value => resolve(value ?? undefined))
        post({read: {id, ...read}})
    })
}

const noOffchain = async () => {
    throw new Error('Metadata_metadata reads no offchain state')
}

const host = {
    getStorage: (key: string) => readState({key}),
    getNextKey: (prefix: string, key: string) => readState({key, prefix}),
    offchainGetStorage: noOffchain,
    offchainTimestamp: noOffchain,
    offchainRandomSeed: noOffchain,
    offchainSubmitTransaction: noOffchain,
}

const text = (hex: string) => Buffer.from(hex.slice(2), 'hex').toString()

async function read(wasm: string): Promise<ProposedRuntime> {
    const version = await get_runtime_version(wasm)
    const task = await run_task({id: 1, wasm, calls: [['Metadata_metadata', []]], mockSignatureHost: 0, allowUnresolvedImports: false, runtimeLogLevel: 0, storageProofSize: 0}, host)
    const result = new Src(task.Call.result)
    const metadata = '0x' + bytesToHex(result.bytes(result.compactLength()))
    const specName = text(version.specName)
    // proves the page can read it later
    new Runtime({specName, specVersion: version.specVersion, implName: text(version.implName), implVersion: version.implVersion}, metadata)
    return {specName, specVersion: version.specVersion, implVersion: version.implVersion, transactionVersion: version.transactionVersion, metadata}
}

read(workerData).then(found => post({found}))
