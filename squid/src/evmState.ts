import {run_task} from '@acala-network/chopsticks-executor'
import type {RpcClient} from '@subsquid/rpc-client'
import {getDynamicBuilder, getLookupFn} from '@polkadot-api/metadata-builders'
import {AccountId, Bytes, Option, decAnyMetadata, u32, unifyMetadata} from '@polkadot-api/substrate-bindings'

/** What contracts answer at one block, the way eth_call, eth_getCode and eth_getStorageAt would. */
export interface EvmState {
    /** The return data, null when the call reverted or failed. */
    call(to: string, data: string): Promise<string | null>
    code(address: string): Promise<string>
    storage(address: string, slot: string): Promise<string>
}

interface Header {
    hash: string
    parentHash: string
    specVersion: number
    _runtime: {specVersion: number}
}

type Metadata = ReturnType<typeof unifyMetadata>
type Builder = ReturnType<typeof getDynamicBuilder>
type RuntimeCall = ReturnType<Builder['buildRuntimeCall']>
type Run = (api: string, method: string, inputs: string[]) => (args: unknown[]) => Promise<any>
type Call = (method: string, args: string) => Promise<string>

const CODE_KEY = '0x3a636f6465'
const ZERO_WORD = '0x' + '00'.repeat(32)
const ZERO_H160 = '0x' + '00'.repeat(20)
// an eth_call naming no sender runs from the zero H160, whose account AccountId32Mapper pads out with 0xEE
const ZERO_H160_ACCOUNT = AccountId().dec(new Uint8Array([...new Uint8Array(20), ...new Uint8Array(12).fill(0xee)]))
// ReturnFlags::REVERT
const REVERT = 1

const hex = (bytes: Uint8Array) => '0x' + Buffer.from(bytes).toString('hex')
const bytes = (hexString: string) => new Uint8Array(Buffer.from(hexString.slice(2), 'hex'))
// a U256 travels as four little endian u64 limbs
const u256 = (v: bigint) => [0n, 64n, 128n, 192n].map(shift => (v >> shift) & 0xffffffffffffffffn)

// the runtime APIs and their types come with metadata v15, read once per spec version
const runtimes = new Map<number, Promise<{metadata: Metadata; builder: Builder}>>()

function runtimeOf(call: Call, specVersion: number) {
    let runtime = runtimes.get(specVersion)
    if (runtime == null) {
        runtime = call('Metadata_metadata_at_version', hex(u32.enc(15))).then(raw => {
            const metadata = unifyMetadata(decAnyMetadata(Option(Bytes()).dec(raw)!))
            return {metadata, builder: getDynamicBuilder(getLookupFn(metadata))}
        })
        runtimes.set(specVersion, runtime)
    }
    return runtime
}

const noOffchain = async (): Promise<never> => {
    throw new Error('an EVM runtime API call reads no offchain state')
}

// state_call runs the code a block leaves behind. a block that sets new code
// was run by its parent's code instead, so that code runs locally over the
// block's storage
function callAt(rpc: RpcClient, header: Header): Call {
    if (header.specVersion === header._runtime.specVersion) return (method, args) => rpc.call('state_call', [method, args, header.hash])
    const wasm: Promise<string> = rpc.call('state_getStorage', [CODE_KEY, header.parentHash])
    const host = {
        getStorage: async (key: string) => (await rpc.call('state_getStorage', [key, header.hash])) ?? undefined,
        getNextKey: async (prefix: string, key: string) => (await rpc.call('state_getKeysPaged', [prefix, 1, key, header.hash]))[0],
        offchainGetStorage: noOffchain,
        offchainTimestamp: noOffchain,
        offchainRandomSeed: noOffchain,
        offchainSubmitTransaction: noOffchain,
    }
    return async (method, args) => {
        const task = await run_task({id: 1, wasm: await wasm, calls: [[method, [args]]], mockSignatureHost: 0, allowUnresolvedImports: false, runtimeLogLevel: 0, storageProofSize: 0}, host)
        if (task.Call == null) throw new Error(`${method} failed at block ${header.hash} with ${task.Error}`)
        return task.Call.result
    }
}

/** Reads contracts through the EVM runtime API of the runtime that ran the block, so no eth RPC is involved. */
export async function evmStateAt(rpc: RpcClient, header: Header): Promise<EvmState> {
    const specVersion = header._runtime.specVersion
    const at = callAt(rpc, header)
    const {metadata, builder} = await runtimeOf(at, specVersion)
    const run: Run = (api, method, inputs) => {
        const found = metadata.apis.find(a => a.name === api)?.methods.find(m => m.name === method)
        if (found == null || found.inputs.map(i => i.name).join() !== inputs.join()) throw new Error(`unhandled ${api}.${method} in spec ${specVersion}`)
        const call: RuntimeCall = builder.buildRuntimeCall(api, method)
        return async args => call.value.dec(await at(`${api}_${method}`, hex(call.args.enc(args))))
    }
    if (metadata.apis.some(a => a.name === 'EthereumRuntimeRPCApi')) return frontierState(run)
    if (metadata.apis.some(a => a.name === 'ReviveApi')) return reviveState(run)
    throw new Error(`spec ${specVersion} offers no EVM runtime API`)
}

// the block gas limit is plenty for a view call, and as with fc-rpc every
// outcome but Succeed counts as no answer
function frontierState(run: Run): EvmState {
    const call = run('EthereumRuntimeRPCApi', 'call', ['from', 'to', 'data', 'value', 'gas_limit', 'max_fee_per_gas', 'max_priority_fee_per_gas', 'nonce', 'estimate', 'access_list', 'authorization_list', 'state_override'])
    const currentBlock = run('EthereumRuntimeRPCApi', 'current_block', [])
    const storageAt = run('EthereumRuntimeRPCApi', 'storage_at', ['address', 'index'])
    const codeAt = run('EthereumRuntimeRPCApi', 'account_code_at', ['address'])
    let gasLimit: Promise<bigint[]> | undefined
    return {
        async call(to, data) {
            gasLimit ??= currentBlock([]).then(block => block.header.gas_limit)
            const res = await call([ZERO_H160, to, bytes(data), u256(0n), await gasLimit, undefined, undefined, undefined, false, undefined, undefined, []])
            return res.success && res.value.exit_reason.type === 'Succeed' ? hex(res.value.value) : null
        },
        async code(address) {
            return hex(await codeAt([address]))
        },
        async storage(address, slot) {
            return storageAt([address, u256(BigInt(slot))])
        },
    }
}

// a call that reverts says so in its flags, and an address with no contract
// reads as an empty slot
function reviveState(run: Run): EvmState {
    const call = run('ReviveApi', 'call', ['origin', 'dest', 'value', 'gas_limit', 'storage_deposit_limit', 'input_data'])
    const getStorage = run('ReviveApi', 'get_storage', ['address', 'key'])
    const codeOf = run('ReviveApi', 'code', ['address'])
    return {
        async call(to, data) {
            const {result} = await call([ZERO_H160_ACCOUNT, to, 0n, undefined, undefined, bytes(data)])
            return result.success && (result.value.flags & REVERT) === 0 ? hex(result.value.data) : null
        },
        async code(address) {
            return hex(await codeOf([address]))
        },
        async storage(address, slot) {
            const res = await getStorage([address, slot])
            return res.success && res.value != null ? hex(res.value) : ZERO_WORD
        },
    }
}
