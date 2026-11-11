import path from 'node:path'
import {Worker} from 'node:worker_threads'
import {RpcClient} from '@subsquid/rpc-client'

export interface ProposedRuntime {
    specName: string
    specVersion: number
    implVersion: number
    transactionVersion: number
    metadata: string
}

export interface StateRead {
    id: number
    key: string
    prefix?: string
}

export type WorkerMessage = {read: StateRead} | {found: ProposedRuntime}

const TIMEOUT_MS = 60_000

/**
 * Anyone can propose any wasm, so it runs where a loop or a crash can only
 * cost the answer. Null when the bytes don't run as a runtime. Storage-backed
 * constants read the chain at block `at`.
 */
export function readRuntime(wasm: string, rpc: RpcClient, at: string): Promise<ProposedRuntime | null> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'runtimeCodeWorker.js'), {workerData: wasm})
        const stop = () => {
            clearTimeout(timer)
            void worker.terminate()
        }
        const finish = (found: ProposedRuntime | null) => {
            stop()
            resolve(found)
        }
        const timer = setTimeout(() => finish(null), TIMEOUT_MS)
        worker.on('message', (msg: WorkerMessage) => {
            if ('found' in msg) return finish(msg.found)
            readState(rpc, at, msg.read).then(
                value => worker.postMessage({id: msg.read.id, value}),
                err => {
                    stop()
                    reject(err)
                }
            )
        })
        worker.once('error', (err: Error) => {
            console.warn(`proposed runtime unreadable: ${err.message}`)
            finish(null)
        })
    })
}

async function readState(rpc: RpcClient, at: string, {key, prefix}: StateRead): Promise<string | null> {
    if (prefix == null) return rpc.call('state_getStorage', [key, at])
    const keys: string[] = await rpc.call('state_getKeysPaged', [prefix, 1, key, at])
    return keys[0] ?? null
}
