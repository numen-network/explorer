import type {Runtime} from '@subsquid/substrate-runtime'

export interface CallNode {
    id: string
    address: number[]
    name: string
    args: any
    success: boolean | null
}

// wrappers that fail whenever what they wrap fails, so their success vouches for it
const PROPAGATES = new Set(['Utility.batch_all', 'Utility.as_derivative', 'Utility.with_weight', 'Utility.dispatch_as_fallible'])

// what each wrapper of this runtime dispatches, by the arg names its pallet declares
function wrapped({name, args}: CallNode): any[] {
    switch (name) {
        case 'Utility.batch':
        case 'Utility.batch_all':
        case 'Utility.force_batch':
            return args.calls
        case 'Utility.as_derivative':
        case 'Utility.dispatch_as':
        case 'Utility.with_weight':
        case 'Utility.dispatch_as_fallible':
        case 'Proxy.proxy':
        case 'Proxy.proxy_announced':
        case 'Multisig.as_multi':
        case 'Multisig.as_multi_threshold_1':
            return [args.call]
        case 'Utility.if_else':
            return [args.main, args.fallback]
        default:
            return []
    }
}

// null when the call certainly left nothing on chain, undefined when the
// chain shows nothing certain about it
function outcome(parent: CallNode, recorded: boolean, index: number, raised: string[]): boolean | null | undefined {
    if (parent.success !== true) return null
    if (PROPAGATES.has(parent.name)) return true
    if (parent.name === 'Utility.if_else' && recorded) {
        if (raised.includes('Utility.IfElseMainSuccess')) return index === 0 ? true : null
        if (raised.includes('Utility.IfElseFallbackCalled')) return index === 0 ? false : true
        throw new Error(`${parent.id} Utility.if_else succeeded without saying which branch ran`)
    }
    // squid walks every wrapper it knows and only skips calls that never ran
    if (recorded) return null
    return undefined
}

/**
 * The calls squid leaves out of an extrinsic's tree: everything under a call
 * that failed or never ran, and whatever sits under a wrapper squid does not
 * know. Each one is decoded from the args of the call that wraps it.
 */
export function missingCalls(root: CallNode, recorded: Map<string, CallNode>, raised: (callId: string) => string[], runtime: Runtime): CallNode[] {
    const added: CallNode[] = []
    const walk = (node: CallNode) => {
        wrapped(node).forEach((src, i) => {
            const id = `${node.id}-${String(i).padStart(6, '0')}`
            const known = recorded.get(id)
            if (known) return walk(known)
            const success = outcome(node, recorded.has(node.id), i, raised(node.id))
            if (success === undefined) return
            const {name, args} = runtime.toCallRecord(typeof src === 'string' ? runtime.decodeCall(src) : src)
            const child = {id, address: [...node.address, i], name, args, success}
            added.push(child)
            walk(child)
        })
    }
    walk(root)
    return added
}
