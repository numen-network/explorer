import path from 'node:path'
import {Worker} from 'node:worker_threads'

export interface ProposedRuntime {
    specName: string
    specVersion: number
    implVersion: number
    transactionVersion: number
    metadata: string
}

const TIMEOUT_MS = 60_000

/**
 * Anyone can propose any wasm, so it runs where a loop or a crash can only
 * cost the answer. Null when the bytes don't run as a runtime.
 */
export function readRuntime(wasm: string): Promise<ProposedRuntime | null> {
    return new Promise(resolve => {
        const worker = new Worker(path.join(__dirname, 'runtimeCodeWorker.js'), {workerData: wasm})
        const finish = (found: ProposedRuntime | null) => {
            clearTimeout(timer)
            void worker.terminate()
            resolve(found)
        }
        const timer = setTimeout(() => finish(null), TIMEOUT_MS)
        worker.once('message', finish)
        worker.once('error', () => finish(null))
    })
}
