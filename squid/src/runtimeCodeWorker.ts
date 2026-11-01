import {parentPort, workerData} from 'node:worker_threads'
import {get_runtime_version, run_task} from '@acala-network/chopsticks-executor'
import {Src} from '@subsquid/scale-codec'
import {Runtime} from '@subsquid/substrate-runtime'
import {bytesToHex} from '@noble/hashes/utils.js'

const noState = async () => {
    throw new Error('Metadata_metadata reads no state')
}
const host = {getStorage: noState, getNextKey: noState, offchainGetStorage: noState, offchainTimestamp: noState, offchainRandomSeed: noState, offchainSubmitTransaction: noState}

const text = (hex: string) => Buffer.from(hex.slice(2), 'hex').toString()

async function read(wasm: string) {
    const version = await get_runtime_version(wasm)
    const task = await run_task({id: 1, wasm, calls: [['Metadata_metadata', []]], mockSignatureHost: 0, allowUnresolvedImports: false, runtimeLogLevel: 0, storageProofSize: 0}, host)
    const result = new Src(task.Call.result)
    const metadata = '0x' + bytesToHex(result.bytes(result.compactLength()))
    const specName = text(version.specName)
    // proves the page can read it later
    new Runtime({specName, specVersion: version.specVersion, implName: text(version.implName), implVersion: version.implVersion}, metadata)
    return {specName, specVersion: version.specVersion, implVersion: version.implVersion, transactionVersion: version.transactionVersion, metadata}
}

read(workerData).then(found => parentPort!.postMessage(found))
